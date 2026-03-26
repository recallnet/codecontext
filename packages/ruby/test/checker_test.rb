# frozen_string_literal: true

require_relative "test_helper"

class CheckerTest < Minitest::Test
  def test_check_paths_accepts_valid_example
    repo_root = File.expand_path("../../..", __dir__)
    messages = CodeContext::Ruby.check_paths([File.join(repo_root, "examples", "ruby", "payments", "gateway.rb")])

    assert_empty messages
  end

  def test_cli_exits_nonzero_for_invalid_file
    Dir.mktmpdir("codecontext-ruby-cli-") do |dir|
      source_path = File.join(dir, "invalid.rb")
      File.write(source_path, "# @context nope -- bad type\n")

      output = `ruby -I#{File.expand_path("../lib", __dir__)} #{File.expand_path("../exe/codecontext-ruby", __dir__)} #{source_path} 2>&1`
      status = $?

      refute status.success?
      assert_includes output, 'Unknown context type: "nope"'
    end
  end
end
