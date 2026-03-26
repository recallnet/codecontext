# frozen_string_literal: true

require "optparse"
require_relative "ruby/version"
require_relative "ruby/parser"
require_relative "ruby/checker"

module CodeContext
  module Ruby
    module CLI
      module_function

      def run(argv)
        options = {
          context_dir: "docs/context",
          check_refs: true
        }

        parser = OptionParser.new do |opts|
          opts.banner = "Usage: codecontext-ruby [options] PATH..."
          opts.on("--context-dir DIR", "Context directory used for bare file refs") do |value|
            options[:context_dir] = value
          end
          opts.on("--[no-]check-refs", "Validate local {@link file:...} references") do |value|
            options[:check_refs] = value
          end
        end

        paths = parser.parse(argv)
        if paths.empty?
          warn(parser.to_s)
          return 1
        end

        messages = CodeContext::Ruby.check_paths(paths, context_dir: options[:context_dir], check_refs: options[:check_refs])
        messages.each do |message|
          warn("#{message.file}:#{message.line}: #{message.message}")
        end
        messages.empty? ? 0 : 1
      end
    end
  end
end
