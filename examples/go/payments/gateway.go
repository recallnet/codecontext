package payments

import "encoding/json"

// @context decision #examples/docs/context/gate-42.md !critical [verified:2026-03-24] -- Strict > avoids duplicate processing.
func ShouldProcess(messageTimestamp int64, cutoff int64) bool {
	return messageTimestamp > cutoff
}

// @context decision:constraint !high [verified:2026-03-24] -- Upstream caps batch size at 100, so keep this guard local.
func ClampBatchSize(size int) int {
	if size > 100 {
		return 100
	}
	return size
}

// @context decision:assumption [verified:2026-03-24] -- Retry budget assumes upstream p99 latency stays under 500ms.
const MaxRetries = 3

// @context requirement #examples/docs/requirements/billing-rounding.md [verified:2026-03-24] -- Finance requires stable settlement rounding.
func RoundForSettlement(cents int64) int64 {
	return cents
}

// @context risk:perf !high [verified:2026-03-24] -- Re-encoding on every call is acceptable only because payloads stay small.
func EncodeEnvelope(payload map[string]any) ([]byte, error) {
	return json.Marshal(payload)
}

// @context risk:security !critical [verified:2026-03-24] -- Caller must validate the webhook signature before decoding.
func DecodeWebhook(body []byte) (map[string]any, error) {
	decoded := map[string]any{}
	err := json.Unmarshal(body, &decoded)
	return decoded, err
}

// @context related #examples/ts/payments/gateway.ts [verified:2026-03-24] -- Keep Go and TS gateway semantics aligned.
func NextRetryCount(base int) int {
	return base + 1
}

// @context history [verified:2026-03-24] -- This loop replaced recursive retry scheduling after stack growth in production.
func RetrySchedule(maxRetries int) []int {
	retries := make([]int, 0, maxRetries)
	for attempt := 1; attempt <= maxRetries; attempt++ {
		retries = append(retries, attempt)
	}
	return retries
}

// @context doc [verified:2026-03-24] -- This helper centralizes JSON encoding so call sites stay narrow.
func MustEncode(payload map[string]any) []byte {
	body, _ := json.Marshal(payload)
	return body
}

// @context:decision:tradeoff #examples/docs/context/cache-strategy.ctx.md -- Legacy form remains accepted during migration.
func CacheStrategy() string {
	return "lru"
}
