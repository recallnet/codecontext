# @context decision {@link file:examples/docs/context/gate-42.md} !critical [verified:2026-03-24] -- Strict > excludes boundary timestamps during gateway clock-skew windows.
def should_process?(timestamp, cutoff)
  timestamp > cutoff
end
