import "server-only";
import { jevClassifier, keywordClassifier, type ServiceClassifier } from "@i-events/core";

/**
 * The classifier used when importing contacts. With TYPESAFE_API_KEY set, Jev proposes the services
 * and the keyword rules cover whatever it can't place (errors, timeout, unclear answers); without
 * the key only the keyword rules run.
 */
export function getServiceClassifier(): ServiceClassifier {
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) return keywordClassifier;
  return jevClassifier({
    apiKey,
    baseUrl: process.env.TYPESAFE_BASE_URL?.trim() || undefined,
    model: process.env.TYPESAFE_MODEL?.trim() || undefined,
    onError: (error) => console.warn("[jev] service classification fell back to keywords:", error instanceof Error ? error.message : error),
  });
}
