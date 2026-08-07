# frozen_string_literal: true

require_relative "../scripts/markdown_variants"

Jekyll::Hooks.register :site, :post_write do |site|
  MarkdownVariants.generate(site.dest)
end
