import "server-only";
import { keywordClassifier, type ServiceClassifier } from "@i-events/core";

/**
 * The classifier used when importing contacts. Keyword rules for now; a model such as Jev plugs in
 * here (behind its API key) without changing the import screen.
 */
export function getServiceClassifier(): ServiceClassifier {
  return keywordClassifier;
}
