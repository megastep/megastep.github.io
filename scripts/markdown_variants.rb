# frozen_string_literal: true

require "fileutils"
require "json"
require "nokogiri"
require "pathname"
require "reverse_markdown"

module MarkdownVariants
  OUTPUT_DIRECTORY = "agent-markdown"
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

  def generate(destination_path, report: false)
    destination = Pathname.new(destination_path).expand_path
    generated_count = 0
    html_paths = Dir.glob(destination.join("**", "*.html").to_s).sort.map do |path|
      Pathname.new(path)
    end

    if report
      rendered_bytes = html_paths.sum { |path| path.size }
      puts "Found #{html_paths.length} rendered HTML pages (#{rendered_bytes} bytes) in #{destination}"
    end

    html_paths.each_with_index do |html_path, index|
      document = Nokogiri::HTML.parse(html_path.read)
      content = extract_content(document, report: report && index.zero?)
      next if content.empty?

      relative_path = html_path.relative_path_from(destination).sub_ext(".md")
      markdown_path = destination.join(OUTPUT_DIRECTORY, relative_path)
      FileUtils.mkdir_p(markdown_path.dirname)
      markdown_path.write(render(document, content))
      generated_count += 1
    end

    generated_count
  end

  def extract_content(document, report: false)
    nodes = document.xpath(
      "//*[local-name()='main'] | " \
      "//*[local-name()='dialog' and " \
      "contains(concat(' ', normalize-space(@class), ' '), ' project-dialog ')]"
    )
    nodes = [document.at_xpath("//*[local-name()='body']")].compact if nodes.empty?
    puts "Selected #{nodes.length} content nodes from #{document.root&.name || 'no root'}" if report
    return "" if nodes.empty?

    markdown = nodes.filter_map do |node|
      copy = node.dup
      copy.css(REMOVED_CONTENT).remove
      converted = ReverseMarkdown.convert(
        copy.to_html,
        github_flavored: true,
        unknown_tags: :bypass
      ).strip
      puts "Converted #{copy.to_html.bytesize} HTML bytes to #{converted.bytesize} Markdown bytes" if report
      converted unless converted.empty?
    end.join("\n\n")

    markdown.gsub(/[ \t]+(?=\n|\z)/, "").gsub(/\n{3,}/, "\n\n")
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

if $PROGRAM_NAME == __FILE__
  destination = ARGV.fetch(0, "_site")
  generated_count = MarkdownVariants.generate(destination, report: true)
  abort "No Markdown variants were generated in #{destination}" if generated_count.zero?

  puts "Generated #{generated_count} Markdown variants in #{destination}/#{MarkdownVariants::OUTPUT_DIRECTORY}"
end
