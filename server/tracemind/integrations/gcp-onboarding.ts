/** Generate a least-privilege, keyless Google Cloud connection plan. */
export interface GcpOnboardingPlan {
  projectId: string;
  serviceAccountEmail: string;
  commands: string[];
  nextSteps: string[];
}

const projectIdPattern = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const serviceAccountPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export function createGcpOnboardingPlan(
  projectId: string,
  accountId = "tracemind-monitor",
): GcpOnboardingPlan {
  if (!projectIdPattern.test(projectId)) throw new Error("Invalid GCP project ID");
  if (!serviceAccountPattern.test(accountId)) throw new Error("Invalid service account ID");
  const serviceAccountEmail = `${accountId}@${projectId}.iam.gserviceaccount.com`;
  return {
    projectId,
    serviceAccountEmail,
    commands: [
      `gcloud services enable logging.googleapis.com --project=${projectId}`,
      `gcloud iam service-accounts create ${accountId} --display-name="TraceMind Log Reader" --project=${projectId}`,
      `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${serviceAccountEmail}" --role="roles/logging.viewer"`,
    ],
    nextSteps: [
      "Review and run these commands as a project administrator; they change IAM permissions.",
      "Deploy the TraceMind backend using a trusted runtime identity with access to the logging reader identity, or attach the reader identity directly where appropriate.",
      "Do not create or upload service-account JSON keys. Use workload identity or short-lived credentials.",
      "Enable polling only after TraceMind verifies read access and the project owner explicitly authorizes monitoring.",
    ],
  };
}
