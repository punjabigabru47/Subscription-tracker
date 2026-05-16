import { Client as WorkflowClient } from "@upstash/workflow";
import {
  NODE_ENV,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,
  QSTASH_TOKEN,
  QSTASH_URL,
} from "./env.js";

const workflowClient =
  NODE_ENV === "test"
    ? {
        trigger: async () => ({ workflowRunId: "test-workflow-run" }),
      }
    : new WorkflowClient({
        baseUrl: QSTASH_URL,
        token: QSTASH_TOKEN,
        currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
      });

export default workflowClient;
