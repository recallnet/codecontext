require_relative "lib/codecontext/ruby/version"

Gem::Specification.new do |spec|
  spec.name = "codecontext-ruby"
  spec.version = CodeContext::Ruby::VERSION
  spec.authors = ["Recall Labs"]
  spec.email = ["oss@recall.net"]

  spec.summary = "Ruby-native checker for @context annotations"
  spec.description = "Validate @context annotations and local {@link file:...} references in Ruby source."
  spec.homepage = "https://github.com/recallnet/codecontext"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 2.6"

  spec.files = Dir.glob("{exe,lib,test}/**/*", File::FNM_DOTMATCH).reject do |path|
    File.directory?(path)
  end
  spec.bindir = "exe"
  spec.executables = ["codecontext-ruby"]
  spec.require_paths = ["lib"]

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["rubygems_mfa_required"] = "true"
end
