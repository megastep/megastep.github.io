# frozen_string_literal: true

require "fileutils"
require "json"
require "nokogiri"
require "pathname"
require "reverse_markdown"

module MarkdownVariants
  OUTPUT_DIRECTORY = "__markdown"
  REMOVED_CONTENT = [
    "nav",
    "footer",
    "script",
    "style",
    "noscript",
    "template",
    "button",
    "[aria-hidden='true']",
    ".project-grid",
    ".resume-actions"
  ].join(", ")

  module_function

  def generate(site)
    destination = Pathname.new(site.dest)

    destination.glob("**/*.html").each do |html_path|
      document = Nokogiri::HTML.parse(html_path.read)
      content = extract_content(document)
      next if content.empty?

      relative_path = html_path.relative_path_from(destination).sub_ext(".md")
      markdown_path = destination.join(OUTPUT_DIRECTORY, relative_path)
      FileUtils.mkdir_p(markdown_path.dirname)
      markdown_path.write(render(document, content))
    end
  end

  def extract_content(document)
    nodes = document.css("main, dialog.project-dialog")
    return "" if nodes.empty?

    fragment = Nokogiri::HTML::DocumentFragment.parse("")
    nodes.each do |node|
      copy = node.dup
      copy.css(REMOVED_CONTENT).remove
      fragment.add_child(copy)
    end

    ReverseMarkdown.convert(
      fragment.to_html,
      github_flavored: true,
      unknown_tags: :bypass
    ).strip.gsub(/\n{3,}/, "\n\n")
  end

  def render(document, content)
    sections = []
    metadata = extract_metadata(document)
    sections << frontmatter(metadata) unless metadata.empty?
    sections << content

    structured_data = document.css('script[type="application/ld+json"]')
      .map { |script| script.text.strip }
      .reject(&:empty?)
    sections << "```json\n#{structured_data.join("\n")}\n```" unless structured_data.empty?

    "#{sections.join("\n\n")}\n"
  end

  def extract_metadata(document)
    {
      "title" => meta_content(document, 'meta[name="title"]') ||
        meta_content(document, 'meta[property="og:title"]') ||
        document.at_css("title")&.text&.strip,
      "description" => meta_content(document, 'meta[name="description"]') ||
        meta_content(document, 'meta[property="og:description"]'),
      "image" => meta_content(document, 'meta[property="og:image"]')
    }.compact.reject { |_key, value| value.empty? }
  end

  def meta_content(document, selector)
    document.at_css(selector)&.[]("content")&.strip
  end

  def frontmatter(metadata)
    lines = metadata.map { |key, value| "#{key}: #{JSON.generate(value)}" }
    "---\n#{lines.join("\n")}\n---"
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  MarkdownVariants.generate(site)
end
