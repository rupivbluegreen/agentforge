package agentforge.authz

import rego.v1

# RBAC: role -> granted permissions. This is the source of truth for what each role can
# do; the application mirrors only the role names.
permissions := {
	"owner": {
		"agent.read", "agent.create", "agent.update", "agent.run", "agent.deploy",
		"audit.read", "workspace.read", "member.manage",
	},
	"admin": {
		"agent.read", "agent.create", "agent.update", "agent.run", "agent.deploy",
		"audit.read", "workspace.read",
	},
	"member": {"agent.read", "agent.create", "agent.update", "agent.run", "workspace.read"},
	"viewer": {"agent.read", "audit.read", "workspace.read"},
}

# Does any of the subject's roles grant the requested action?
role_allows if {
	some role in input.subject.roles
	input.action in permissions[role]
}

# Hard prohibition (ABAC), independent of role: a prohibited-practice agent (EU AI Act
# Art 5) can never be deployed. This overrides any role grant.
deny_reason := "prohibited AI practice cannot be deployed (EU AI Act Art 5)" if {
	input.action == "agent.deploy"
	input.resource.riskTier == "prohibited"
}

# Single decision document the PDP reads. Deny by default.
default decision := {"allow": false, "reason": "no matching policy (deny by default)"}

decision := {"allow": false, "reason": deny_reason} if {
	deny_reason
}

decision := {"allow": true, "reason": "granted by role"} if {
	not deny_reason
	role_allows
}

decision := {"allow": false, "reason": "action not permitted for your role"} if {
	not deny_reason
	not role_allows
}
