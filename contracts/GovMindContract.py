import json

import gl


class GovMindContract:
    """A simple GenLayer Intelligent Contract for storing and analyzing proposals."""

    def __init__(self):
        # Proposals are stored by numeric ID so they are easy to fetch later.
        self.proposals = {}
        self.next_proposal_id = 1

        # Reputation is kept separate from proposals so it can be expanded later.
        self.user_reputation = {}

    def submit_proposal(self, title, proposal_text, evidence_url):
        """Create a proposal and return its stored JSON record."""
        creator = gl.message.sender
        proposal_id = self.next_proposal_id
        self.next_proposal_id += 1

        proposal = {
            "id": proposal_id,
            "title": title,
            "proposal_text": proposal_text,
            "evidence_url": evidence_url,
            "creator": creator,
            "ai_analysis": None,
            "timestamp": gl.block.timestamp,
        }

        self.proposals[proposal_id] = proposal

        # Give the creator a small mock reputation point for submitting.
        self.user_reputation[creator] = self.user_reputation.get(creator, 0) + 1

        return self._json(proposal)

    def analyze_proposal(self, proposal_id):
        """Fetch evidence, ask AI to analyze the proposal, and store the result."""
        proposal = self.proposals.get(proposal_id)
        if proposal is None:
            return self._json({"error": "PROPOSAL_NOT_FOUND"})

        # Fetch evidence from the provided URL using GenLayer nondeterministic web access.
        # Keep this simple: the fetched evidence is passed into the AI prompt below.
        evidence_response = gl.nondet.web.get(proposal["evidence_url"])

        prompt = f"""
Analyze this DAO governance proposal and return JSON only.

Proposal title:
{proposal["title"]}

Proposal text:
{proposal["proposal_text"]}

Evidence URL:
{proposal["evidence_url"]}

Evidence fetched from URL:
{evidence_response}

Return exactly this JSON shape:
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
"""

        # Ask the GenLayer AI runtime to produce the structured analysis.
        ai_response = gl.nondet.exec_prompt(prompt)
        analysis = self._safe_json_loads(ai_response)

        proposal["ai_analysis"] = analysis
        self.proposals[proposal_id] = proposal

        return self._json(analysis)

    def get_proposal(self, proposal_id):
        """Return one proposal by ID."""
        proposal = self.proposals.get(proposal_id)
        if proposal is None:
            return self._json({"error": "PROPOSAL_NOT_FOUND"})

        return self._json(proposal)

    def get_all_proposals(self):
        """Return every stored proposal as a list."""
        return self._json(list(self.proposals.values()))

    def get_user_reputation(self, address):
        """Return a user's current mock reputation score."""
        return self._json(
            {
                "address": address,
                "reputation": self.user_reputation.get(address, 0),
            }
        )

    def _safe_json_loads(self, value):
        """Convert an AI JSON string into a Python dictionary with a safe fallback."""
        try:
            parsed = json.loads(value)
        except Exception:
            parsed = {
                "recommendation": "INSUFFICIENT_CONTEXT",
                "confidence": 0,
                "risk_score": 0,
                "treasury_impact": "LOW",
                "governance_attack_risk": "LOW",
                "summary": "AI response was not valid JSON.",
                "benefits": [],
                "risks": ["Analysis could not be parsed."],
                "missing_details": ["Valid JSON analysis response."],
                "suggested_improvements": ["Run analysis again with clearer proposal details."],
                "evidence_used": [],
            }

        return self._normalize_analysis(parsed)

    def _normalize_analysis(self, analysis):
        """Make sure the analysis always contains every expected JSON field."""
        defaults = {
            "recommendation": "INSUFFICIENT_CONTEXT",
            "confidence": 0,
            "risk_score": 0,
            "treasury_impact": "LOW",
            "governance_attack_risk": "LOW",
            "summary": "",
            "benefits": [],
            "risks": [],
            "missing_details": [],
            "suggested_improvements": [],
            "evidence_used": [],
        }

        if not isinstance(analysis, dict):
            analysis = {}

        return {**defaults, **analysis}

    def _json(self, value):
        """Return structured JSON only."""
        return json.dumps(value)
