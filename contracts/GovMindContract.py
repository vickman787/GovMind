# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

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

    # Bounds applied to the leader's returned analysis. This keeps the
    # validator from accepting a well-formed but unbounded payload (a leader
    # could otherwise stuff huge strings/arrays into an accepted response).
    MAX_SUMMARY_LENGTH = 2000
    MAX_LIST_ITEMS = 12
    MAX_LIST_ITEM_LENGTH = 300
    MAX_EVIDENCE_SNAPSHOT_LENGTH = 2000

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
            "evidence_snapshot": None,
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

        def leader_fn():
            if evidence_url == "":
                evidence_note = "No evidence URL was provided."
            else:
                try:
                    web_content = gl.nondet.web.get(evidence_url)
                    evidence_note = f"Content from {evidence_url}:\n{web_content}"
                except Exception as e:
                    evidence_note = f"Failed to fetch {evidence_url}: {e}"

            prompt = f"""
You are analyzing a DAO governance proposal for GovMind.

Return JSON only. Do not return markdown. Do not include extra text.

Required JSON shape:
{{
  "recommendation": "APPROVE | REJECT | NEEDS_REVISION | INSUFFICIENT_CONTEXT",
  "confidence": 0,
  "risk_score": 0,
  "treasury_impact": "LOW | MEDIUM | HIGH",
  "governance_attack_risk": "LOW | MEDIUM | HIGH",
  "summary": "short explanation",
  "benefits": [],
  "risks": [],
  "missing_details": [],
  "suggested_improvements": [],
  "evidence_used": []
}}

Rules:
- recommendation must be one of APPROVE, REJECT, NEEDS_REVISION, INSUFFICIENT_CONTEXT.
- confidence must be a number from 0 to 100.
- risk_score must be a number from 0 to 100.
- treasury_impact must be LOW, MEDIUM, or HIGH.
- governance_attack_risk must be LOW, MEDIUM, or HIGH.
- Use INSUFFICIENT_CONTEXT if the proposal is too vague.

Proposal title:
{title}

Proposal text:
{proposal_text}

Evidence note:
{evidence_note}
"""
            # exec_prompt(response_format="json") returns the LLM's JSON
            # output as a raw string, not a parsed object, so it must be
            # parsed here before validator_fn can inspect it as a dict.
            llm_raw = gl.nondet.exec_prompt(prompt, response_format="json")
            try:
                llm_result = json.loads(llm_raw) if isinstance(llm_raw, str) else llm_raw
            except (TypeError, ValueError):
                llm_result = {}

            # Bundle the fetched evidence alongside the LLM output so it can
            # be permanently snapshotted on-chain once, instead of only
            # trusting the LLM's self-reported "evidence_used" field.
            return {
                "analysis": llm_result,
                "evidence_snapshot": evidence_note[: self.MAX_EVIDENCE_SNAPSHOT_LENGTH],
            }

        def validator_fn(leader_result):
            if not isinstance(leader_result, gl.vm.Return):
                return False

            payload = leader_result.calldata
            if not isinstance(payload, dict):
                return False

            if not isinstance(payload.get("evidence_snapshot"), str):
                return False

            return self._analysis_has_valid_shape(payload.get("analysis"))

        raw_payload = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        raw_analysis = raw_payload.get("analysis") if isinstance(raw_payload, dict) else None
        analysis = self._normalize_analysis(raw_analysis)
        evidence_snapshot = (raw_payload or {}).get("evidence_snapshot", "")
        proposal["evidence_snapshot"] = str(evidence_snapshot)[: self.MAX_EVIDENCE_SNAPSHOT_LENGTH]

        proposal["ai_analysis"] = analysis
        self.proposals[proposal_id] = self._json(proposal)

        # Reputation is only granted once, on the proposal's single analysis
        # pass, and only when the AI judged there was enough substance to
        # form a real recommendation. This ties reputation to a quality
        # signal instead of raw submission/analysis volume.
        if analysis["recommendation"] != "INSUFFICIENT_CONTEXT":
            creator = proposal["creator"]
            current_reputation = int(self.user_reputation.get(creator, "0"))
            self.user_reputation[creator] = str(current_reputation + 1)

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

    def _analysis_has_valid_shape(self, analysis) -> bool:
        """Validate the leader result without requiring exact LLM wording.

        NOTE ON VALIDATION SCOPE: this checks structure, value ranges, and
        size bounds (right fields, right types, capped string/list sizes).
        It does not verify that the recommendation is factually correct,
        since that would require validators to independently re-derive and
        cross-check judgment (for example a comparative equivalence
        principle across multiple LLM runs) rather than re-checking the
        leader's declared shape. Treat analyze_proposal's output as an
        AI-assisted signal for human DAO voters, not as ground truth.
        """
        if not isinstance(analysis, dict):
            return False

        if analysis.get("recommendation") not in [
            "APPROVE",
            "REJECT",
            "NEEDS_REVISION",
            "INSUFFICIENT_CONTEXT",
        ]:
            return False

        if analysis.get("treasury_impact") not in ["LOW", "MEDIUM", "HIGH"]:
            return False

        if analysis.get("governance_attack_risk") not in ["LOW", "MEDIUM", "HIGH"]:
            return False

        if not self._is_score(analysis.get("confidence")) or not self._is_score(
            analysis.get("risk_score")
        ):
            return False

        if not self._is_bounded_str(analysis.get("summary"), self.MAX_SUMMARY_LENGTH):
            return False

        for field in (
            "benefits",
            "risks",
            "missing_details",
            "suggested_improvements",
            "evidence_used",
        ):
            if not self._is_bounded_str_list(analysis.get(field)):
                return False

        return True

    def _normalize_analysis(self, analysis):
        """Ensure analyze_proposal always returns the same JSON fields."""
        if not isinstance(analysis, dict):
            analysis = {}

        return {
            "recommendation": self._allowed_value(
                analysis.get("recommendation"),
                ["APPROVE", "REJECT", "NEEDS_REVISION", "INSUFFICIENT_CONTEXT"],
                "INSUFFICIENT_CONTEXT",
            ),
            "confidence": self._bounded_score(analysis.get("confidence")),
            "risk_score": self._bounded_score(analysis.get("risk_score")),
            "treasury_impact": self._allowed_value(
                analysis.get("treasury_impact"),
                ["LOW", "MEDIUM", "HIGH"],
                "LOW",
            ),
            "governance_attack_risk": self._allowed_value(
                analysis.get("governance_attack_risk"),
                ["LOW", "MEDIUM", "HIGH"],
                "LOW",
            ),
            "summary": str(analysis.get("summary", ""))[: self.MAX_SUMMARY_LENGTH],
            "benefits": self._safe_list(analysis.get("benefits")),
            "risks": self._safe_list(analysis.get("risks")),
            "missing_details": self._safe_list(analysis.get("missing_details")),
            "suggested_improvements": self._safe_list(
                analysis.get("suggested_improvements")
            ),
            "evidence_used": self._safe_list(analysis.get("evidence_used")),
        }

    def _allowed_value(self, value, allowed, fallback: str) -> str:
        if value in allowed:
            return value

        return fallback

    def _is_score(self, value) -> bool:
        try:
            score = int(value)
        except Exception:
            return False

        return 0 <= score <= 100

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

    def _is_bounded_str(self, value, max_length: int) -> bool:
        return isinstance(value, str) and len(value) <= max_length

    def _is_bounded_str_list(self, value) -> bool:
        if not isinstance(value, list):
            return False

        if len(value) > self.MAX_LIST_ITEMS:
            return False

        return all(self._is_bounded_str(item, self.MAX_LIST_ITEM_LENGTH) for item in value)

    def _json(self, value) -> str:
        """Return structured JSON strings from all public methods."""
        return json.dumps(value, sort_keys=True)
