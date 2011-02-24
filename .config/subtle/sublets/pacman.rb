configure :pacman do |s|
  s.interval = s.config[:interval] || 1800
  s.icon     = Subtlext::Icon.new("pacman.xbm")
  s.ignore   = Subtlext::Color.new("#555")
end

helper do |s|
  def pacman_qu
    list, x = File.read("/etc/pacman.conf").scan(/^IgnorePkg\s*=\s*(.*)$/).first
    count, skip = 0, 0

    `pacman -Qu`.scan(/^[^\s]+/).each do |pkg|
      list.split.each {|ipkg| skip += 1 if pkg == ipkg} unless list == nil
      count += 1
    end

    self.data = "%s%s%s+%s" % [ self.icon, count - skip, self.ignore, skip  ]
  end
end

on :run do |s|
  s.pacman_qu
end

on :mouse_down do |s|
  s.pacman_qu
end
