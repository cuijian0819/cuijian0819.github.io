# Patch to handle Errno::EDEADLK on Docker volume mounts (macOS + VirtioFS + Ruby 3.4)

# Fix has_yaml_header? for binary files
module Jekyll
  module Utils
    def has_yaml_header?(file)
      File.open(file, "rb") do |f|
        f.readline =~ %r!\A---\s*\r?\n!
      end
    rescue EOFError, Errno::EDEADLK
      false
    end
  end
end

# In development, restore StaticFile#write to avoid jekyll-minifier
# triggering EDEADLK when it tries to IO.read binary files from Docker volume mounts
if ENV["JEKYLL_ENV"] == "development"
  require "jekyll-minifier"

  module Jekyll
    class StaticFile
      def write(dest)
        dest_path = destination(dest)
        return false if File.exist?(dest_path) && !modified?

        self.class.mtimes[path] = mtime
        FileUtils.mkdir_p(File.dirname(dest_path))
        FileUtils.rm(dest_path) if File.exist?(dest_path)
        copy_file(dest_path)
        true
      end

      def copy_file(dest_path)
        FileUtils.cp(path, dest_path)
      rescue Errno::EDEADLK
        system("cp", path, dest_path)
      end
    end
  end
end
