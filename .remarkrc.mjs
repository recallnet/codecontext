import { createDocsGovernanceConfig } from "@recallnet/docs-governance-preset";

export default createDocsGovernanceConfig({
  policyPath: "./docs/docs-policy.json",
  frontmatterSchemaPath: "./docs/docs-frontmatter.schema.json",
});
