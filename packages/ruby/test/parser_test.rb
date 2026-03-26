# frozen_string_literal: true

require_relative "test_helper"

class ParserTest < Minitest::Test
  def test_parses_valid_context_tag
    Dir.mktmpdir("codecontext-ruby-parser-") do |dir|
      FileUtils.mkdir_p(File.join(dir, "docs", "context"))
      File.write(File.join(dir, "docs", "context", "api-limits.md"), "# limits\n")

      source = <<~RUBY
        # @context decision:constraint {@link file:docs/context/api-limits.md} !high [verified:2026-03-24] -- Stripe caps batch size at 100.
        def clamp_batch_size(size)
          [size, 100].min
        end
      RUBY

      result = CodeContext::Ruby.parse_source(source, dir)

      assert_empty result.errors
      assert_equal 1, result.tags.length
      assert_equal "decision", result.tags.first.type
      assert_equal "constraint", result.tags.first.subtype
      assert_equal "file:docs/context/api-limits.md", result.tags.first.id
    end
  end

  def test_reports_unresolved_ref
    Dir.mktmpdir("codecontext-ruby-parser-") do |dir|
      source = <<~RUBY
        # @context decision {@link file:docs/context/missing.md} [verified:2026-03-24] -- Missing backing doc.
        def process_payment; end
      RUBY

      result = CodeContext::Ruby.parse_source(source, dir)

      assert_includes result.errors, 'Unresolved context reference: "file:docs/context/missing.md"'
    end
  end
end
