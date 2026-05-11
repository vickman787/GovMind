# { "Depends": "py-genlayer:test" }

import json

from genlayer import *


class GovMindContract(gl.Contract):
    """Simple GovMind contract for GenLayer Studio testing."""

    # Keep storage simple and Studio-friendly.
    # Proposal objects are stored as JSON strings.
    proposals: TreeMap[str, str]
    user_reputation: TreeMap[str, str]
    user_addresses: TreeMap[str, str]
    proposal_count: u256
    user_count: u256

    def __init__(self):
        self.proposal_count = u256(0)
        self.user_count = u256(0)

    @gl.public.write
    def submit_proposal(self, title: str, proposal_text: str, evidence_url: str) -> str:
        """Store a proposal. This function does not use AI or web access."""
        proposal_id = str(int(self.proposal_count))
        creator = str(gl.message.sender_address)

        proposal = {
            "id": proposal_id,
            "title": title,
            "proposal_text": proposal_text,
            "evidence_url": evidence_url,
            "creator": creator,
            "ai_analysis": None,
            "timestamp": "created_in_genlayer_studio",
        }

        self.proposals[proposal_id] = self._json(proposal)
        self.proposal_count = u256(int(self.proposal_count) + 1)

        current_reputation = int(self.user_reputation.get(creator, "0"))
        if current_reputation == 0:
            self.user_addresses[str(int(self.user_count))] = creator
            self.user_count = u256(int(self.user_count) + 1)

        self.user_reputation[creator] = str(current_reputation + 1)

        return self._json(proposal)

    @gl.public.write
    def analyze_proposal(self, proposal_id: str) -> str:
        """Analyze a proposal and return structured JSON only."""
        if proposal_id not in self.proposals:
            return self._json({"error": "PROPOSAL_NOT_FOUND", "proposal_id": proposal_id})

        proposal = json.loads(self.proposals[proposal_id])
        title = proposal["title"]
        proposal_text = proposal["proposal_text"]
        evidence_url = proposal["evidence_url"]

        # Web fetching is intentionally skipped for this Studio-safe version.
        # When the basic contract is stable, gl.nondet.web.get(evidence_url)
        # can be added back inside leader_fn below.
        if evidence_url == "":
            evidence_note = "No evidence URL was provided."
            evidence_used = []
        else:
            evidence_note = f"Evidence URL provided but not fetched in this safe Studio test: {evidence_url}"
            evidence_used = [evidence_url]

        def leader_fn():
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
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_result):
            if not isinstance(leader_result, gl.vm.Return):
                return False

            return self._analysis_has_valid_shape(leader_result.calldata)

        raw_analysis = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        analysis = self._normalize_analysis(raw_analysis)
        analysis["evidence_used"] = evidence_used

        proposal["ai_analysis"] = analysis
        self.proposals[proposal_id] = self._json(proposal)

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
        """Validate the leader result without requiring exact LLM wording."""
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

        return self._is_score(analysis.get("confidence")) and self._is_score(
            analysis.get("risk_score")
        )

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
            "summary": str(analysis.get("summary", "")),
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
        if isinstance(value, list):
            return value

        return []

    def _json(self, value) -> str:
        """Return structured JSON strings from all public methods."""
        return json.dumps(value, sort_keys=True)
