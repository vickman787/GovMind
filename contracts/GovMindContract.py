# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json

from genlayer import *


class GovMindContract(gl.Contract):
    """Simple GovMind contract for GenLayer Studio testing."""

    # Keep storage simple and Studio-friendly.
    # Proposal objects are stored as JSON strings.
    proposals: TreeMap[str, str]
    user_reputation: TreeMap[str, str]
    user_addresses: TreeMap[str, str]
    known_users: TreeMap[str, str]
    proposal_count: u256
    user_count: u256

    # Bounds keep a single proposal cheap to store and cheap to feed into the
    # LLM prompt, and stop one submission from being able to bloat contract
    # storage or the nondet prompt payload without limit.
    MAX_TITLE_LENGTH = 200
    MIN_PROPOSAL_TEXT_LENGTH = 20
    MAX_PROPOSAL_TEXT_LENGTH = 6000
    MAX_EVIDENCE_URL_LENGTH = 500

    # Bounds applied to the agreed analysis text before it's stored, so one
    # oversized field can't bloat contract storage.
    MAX_SUMMARY_LENGTH = 2000
    MAX_LIST_ITEMS = 12
    MAX_LIST_ITEM_LENGTH = 300

    def __init__(self):
        self.proposal_count = u256(0)
        self.user_count = u256(0)

    @gl.public.write
    def submit_proposal(self, title: str, proposal_text: str, evidence_url: str) -> str:
        """Store a proposal. This function does not use AI or web access."""
        title = title.strip()
        proposal_text = proposal_text.strip()
        evidence_url = evidence_url.strip()

        if not title or len(title) > self.MAX_TITLE_LENGTH:
            raise Exception(
                f"title must be 1-{self.MAX_TITLE_LENGTH} characters"
            )

        if not (
            self.MIN_PROPOSAL_TEXT_LENGTH
            <= len(proposal_text)
            <= self.MAX_PROPOSAL_TEXT_LENGTH
        ):
            raise Exception(
                "proposal_text must be "
                f"{self.MIN_PROPOSAL_TEXT_LENGTH}-{self.MAX_PROPOSAL_TEXT_LENGTH} characters"
            )

        if len(evidence_url) > self.MAX_EVIDENCE_URL_LENGTH:
            raise Exception(
                f"evidence_url must be at most {self.MAX_EVIDENCE_URL_LENGTH} characters"
            )

        proposal_id = str(int(self.proposal_count))
        creator = str(gl.message.sender_address)

        proposal = {
            "id": proposal_id,
            "title": title,
            "proposal_text": proposal_text,
            "evidence_url": evidence_url,
            "evidence_content_hash": None,
            "creator": creator,
            "ai_analysis": None,
            "timestamp": "created_in_genlayer_studio",
        }

        self.proposals[proposal_id] = self._json(proposal)
        self.proposal_count = u256(int(self.proposal_count) + 1)

        # Registering a user does not grant reputation by itself. Reputation
        # is only earned once a proposal clears real AI analysis (see
        # analyze_proposal), so submission volume alone cannot inflate score.
        if creator not in self.known_users:
            self.known_users[creator] = "1"
            self.user_addresses[str(int(self.user_count))] = creator
            self.user_count = u256(int(self.user_count) + 1)
            self.user_reputation[creator] = "0"

        return self._json(proposal)

    @gl.public.write
    def analyze_proposal(self, proposal_id: str) -> str:
        """Analyze a proposal and return structured JSON only.

        Analysis is one-shot: once a proposal has an ai_analysis, this call
        is a no-op that returns ALREADY_ANALYZED instead of re-fetching
        evidence or re-running the LLM. Without this lock, anyone could keep
        re-triggering analysis to overwrite a prior result or to re-roll
        against a since-changed evidence_url.
        """
        if proposal_id not in self.proposals:
            return self._json({"error": "PROPOSAL_NOT_FOUND", "proposal_id": proposal_id})

        proposal = json.loads(self.proposals[proposal_id])

        if proposal.get("ai_analysis") is not None:
            return self._json({"error": "ALREADY_ANALYZED", "proposal_id": proposal_id})

        title = proposal["title"]
        proposal_text = proposal["proposal_text"]
        evidence_url = proposal["evidence_url"]

        def gather_evidence_note() -> str:
            # Every validator (not just the leader) runs this function
            # independently, so every validator fetches evidence_url itself
            # rather than trusting the leader's claim about what it found.
            if evidence_url == "":
                return "No evidence URL was provided."
            try:
                response = gl.nondet.web.get(evidence_url)
                # response.body is raw bytes - it must be explicitly decoded,
                # not interpolated directly, or the LLM sees a bytes repr
                # instead of the actual page text.
                web_content = response.body.decode("utf-8")
                return f"Content from {evidence_url}:\n{web_content}"
            except Exception as e:
                return f"Failed to fetch {evidence_url}: {e}"

        # Stage 1: bind the analysis to the evidence actually evaluated. Every
        # validator independently fetches evidence_url and hashes what it saw;
        # strict_eq requires every validator's hash to match byte-for-byte, so
        # the hash we store is something the whole validator set agreed on,
        # not just a leader-reported value.
        def hash_evidence() -> str:
            note = gather_evidence_note()
            return hashlib.sha256(note.encode("utf-8")).hexdigest()

        evidence_content_hash = gl.eq_principle.strict_eq(hash_evidence)

        # Stage 2: the actual fix for "validators only check schema, not the
        # substantive recommendation". Every validator independently derives
        # its OWN classification (recommendation, risk band, treasury impact,
        # governance attack risk band) from the proposal and evidence, and
        # prompt_comparative requires those independently-derived values to
        # match the leader's before the transaction is accepted. This is
        # different from prompt_non_comparative (used below for the prose
        # fields), where validators only judge the leader's own output
        # against criteria rather than independently reproducing it.
        def classify() -> dict:
            evidence_note = gather_evidence_note()
            prompt = f"""
You are classifying a DAO governance proposal for GovMind. Return JSON only,
no markdown, no extra text, matching exactly this shape:
{{
  "recommendation": "APPROVE | REJECT | NEEDS_REVISION | INSUFFICIENT_CONTEXT",
  "risk_band": "LOW | MEDIUM | HIGH",
  "treasury_impact": "LOW | MEDIUM | HIGH",
  "governance_attack_risk": "LOW | MEDIUM | HIGH"
}}

Use INSUFFICIENT_CONTEXT if the proposal is too vague to classify.

Proposal title:
{title}

Proposal text:
{proposal_text}

Evidence note:
{evidence_note}
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(parsed, dict):
                parsed = {}

            return {
                "recommendation": str(parsed.get("recommendation", "")),
                "risk_band": str(parsed.get("risk_band", "")),
                "treasury_impact": str(parsed.get("treasury_impact", "")),
                "governance_attack_risk": str(parsed.get("governance_attack_risk", "")),
            }

        classification_principle = """
recommendation must be exactly the same value in both results: one of APPROVE, REJECT, NEEDS_REVISION, INSUFFICIENT_CONTEXT.
risk_band must be exactly the same value in both results: one of LOW, MEDIUM, HIGH.
treasury_impact must be exactly the same value in both results: one of LOW, MEDIUM, HIGH.
governance_attack_risk must be exactly the same value in both results: one of LOW, MEDIUM, HIGH.
These are categorical classifications, not continuous measurements, so there is no acceptable tolerance - only an exact match on every field counts as equivalent.
"""

        raw_classification = gl.eq_principle.prompt_comparative(
            classify,
            classification_principle,
        )
        classification = self._normalize_classification(raw_classification)

        # Stage 3: the free-text narrative (summary, benefits, risks, etc).
        # This still uses prompt_non_comparative - every validator fetches
        # its own evidence and checks the leader's prose against criteria,
        # but exact-match consensus on wording isn't meaningful for prose the
        # way it is for the categorical fields above.
        def gather_narrative_context() -> str:
            evidence_note = gather_evidence_note()
            return f"""
This proposal was independently classified by DAO validators as:
recommendation={classification['recommendation']}
risk_score={classification['risk_score']}
treasury_impact={classification['treasury_impact']}
governance_attack_risk={classification['governance_attack_risk']}

Proposal title:
{title}

Proposal text:
{proposal_text}

Evidence note:
{evidence_note}
"""

        narrative_task = """
Write supporting analysis for the classification above. Return JSON only,
no markdown, no extra text, matching exactly this shape:
{
  "confidence": 0,
  "summary": "short explanation",
  "benefits": [],
  "risks": [],
  "missing_details": [],
  "suggested_improvements": [],
  "evidence_used": []
}
confidence must be a number from 0 to 100.
"""

        narrative_criteria = """
The response is valid JSON with exactly the fields required by the task, and no markdown or extra text.
confidence is a number from 0 to 100.
summary, benefits, risks, missing_details, and suggested_improvements are consistent with the stated classification and meaningfully reference specific content from this proposal or its evidence, not boilerplate that could apply to any proposal.
If the evidence note says no evidence was provided or fetching it failed, that limitation is reflected in missing_details or a lower confidence score rather than ignored.
"""

        raw_narrative_text = gl.eq_principle.prompt_non_comparative(
            gather_narrative_context,
            task=narrative_task,
            criteria=narrative_criteria,
        )

        try:
            raw_narrative = (
                json.loads(raw_narrative_text)
                if isinstance(raw_narrative_text, str)
                else raw_narrative_text
            )
        except (TypeError, ValueError):
            raw_narrative = None

        narrative = self._normalize_narrative(raw_narrative)

        analysis = {**classification, **narrative}

        proposal["evidence_content_hash"] = str(evidence_content_hash)[:64]
        proposal["ai_analysis"] = analysis
        self.proposals[proposal_id] = self._json(proposal)

        # Reputation is only granted once, on the proposal's single analysis
        # pass, and scaled by how much merit the independently-agreed
        # classification reflects: APPROVE (proposal is good as-is) earns
        # more than NEEDS_REVISION (has a genuine idea worth fixing). REJECT
        # (judged harmful/unworkable) and INSUFFICIENT_CONTEXT (too vague to
        # evaluate) earn nothing, so reputation can't be inflated by
        # submitting proposals that simply produce *some* analysis.
        reputation_gain = {"APPROVE": 2, "NEEDS_REVISION": 1}.get(
            analysis["recommendation"], 0
        )
        if reputation_gain:
            creator = proposal["creator"]
            current_reputation = int(self.user_reputation.get(creator, "0"))
            self.user_reputation[creator] = str(current_reputation + reputation_gain)

        return self._json(analysis)

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> str:
        """Return one proposal by ID."""
        if proposal_id not in self.proposals:
            return self._json({"error": "PROPOSAL_NOT_FOUND", "proposal_id": proposal_id})

        return self.proposals[proposal_id]

    @gl.public.view
    def get_all_proposals(self) -> str:
        """Return all stored proposals."""
        proposals = []

        for index in range(int(self.proposal_count)):
            proposal_id = str(index)
            if proposal_id in self.proposals:
                proposals.append(json.loads(self.proposals[proposal_id]))

        return self._json(proposals)

    @gl.public.view
    def get_user_reputation(self, address: str) -> str:
        """Return a user's simple reputation score."""
        return self._json(
            {
                "address": address,
                "reputation": int(self.user_reputation.get(address, "0")),
            }
        )

    @gl.public.view
    def get_leaderboard(self) -> str:
        """Return all users with reputation scores for leaderboard display."""
        users = []

        for index in range(int(self.user_count)):
            address = self.user_addresses[str(index)]
            users.append(
                {
                    "address": address,
                    "reputation": int(self.user_reputation.get(address, "0")),
                }
            )

        return self._json(users)

    # Representative midpoint shown for each risk band so the frontend's
    # existing "risk_score%" display keeps working without changes, while
    # the actual consensus-critical value is the band itself.
    RISK_BAND_SCORES = {"LOW": 20, "MEDIUM": 50, "HIGH": 80}

    def _normalize_classification(self, classification):
        """Ensure the comparative-agreed classification always has the same fields."""
        if not isinstance(classification, dict):
            classification = {}

        risk_band = self._allowed_value(
            classification.get("risk_band"), ["LOW", "MEDIUM", "HIGH"], "LOW"
        )

        return {
            "recommendation": self._allowed_value(
                classification.get("recommendation"),
                ["APPROVE", "REJECT", "NEEDS_REVISION", "INSUFFICIENT_CONTEXT"],
                "INSUFFICIENT_CONTEXT",
            ),
            "risk_score": self.RISK_BAND_SCORES[risk_band],
            "treasury_impact": self._allowed_value(
                classification.get("treasury_impact"),
                ["LOW", "MEDIUM", "HIGH"],
                "LOW",
            ),
            "governance_attack_risk": self._allowed_value(
                classification.get("governance_attack_risk"),
                ["LOW", "MEDIUM", "HIGH"],
                "LOW",
            ),
        }

    def _normalize_narrative(self, narrative):
        """Ensure the free-text narrative always has the same fields."""
        if not isinstance(narrative, dict):
            narrative = {}

        return {
            "confidence": self._bounded_score(narrative.get("confidence")),
            "summary": str(narrative.get("summary", ""))[: self.MAX_SUMMARY_LENGTH],
            "benefits": self._safe_list(narrative.get("benefits")),
            "risks": self._safe_list(narrative.get("risks")),
            "missing_details": self._safe_list(narrative.get("missing_details")),
            "suggested_improvements": self._safe_list(
                narrative.get("suggested_improvements")
            ),
            "evidence_used": self._safe_list(narrative.get("evidence_used")),
        }

    def _allowed_value(self, value, allowed, fallback: str) -> str:
        if value in allowed:
            return value

        return fallback

    def _bounded_score(self, value) -> int:
        try:
            score = int(value)
        except Exception:
            return 0

        if score < 0:
            return 0
        if score > 100:
            return 100

        return score

    def _safe_list(self, value):
        if not isinstance(value, list):
            return []

        bounded = [str(item) for item in value if isinstance(item, str)]
        bounded = [item[: self.MAX_LIST_ITEM_LENGTH] for item in bounded]
        return bounded[: self.MAX_LIST_ITEMS]

    def _json(self, value) -> str:
        """Return structured JSON strings from all public methods."""
        return json.dumps(value, sort_keys=True)
