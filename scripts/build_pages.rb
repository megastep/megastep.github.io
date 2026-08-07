# frozen_string_literal: true

require "jekyll"
require "jekyll/commands/build"

jekyll_environment = ENV.fetch("JEKYLL_ENV", "production")
configs = ENV.fetch(
  "CONFIGS",
  jekyll_environment == "production" ? "_config.yml,_config_prod.yml" : "_config.yml"
)

ENV["JEKYLL_ENV"] = jekyll_environment
Jekyll::Commands::Build.process(
  "config" => configs.split(","),
  "destination" => "_site",
  "source" => Dir.pwd,
  "serving" => false
)

require_relative "markdown_variants"

generated_count = MarkdownVariants.generate("_site", report: true)
abort "No Markdown variants were generated" if generated_count.zero?

puts "Generated #{generated_count} Markdown variants in _site/#{MarkdownVariants::OUTPUT_DIRECTORY}"
