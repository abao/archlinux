# Membar sublet file
# Created with sur-0.2.168

# Bar class {{{
class Bar
  # Bar value
  attr_accessor :value

  ## initialize {{{
  # Initializer
  # @param [String]  name    Name of the bar
  # @param [Fixnum]  width   Width of the bar
  # @param [Fixnum]  height  Height of the bar
  ##

  def initialize(name, width = 50, height = 9)
    @name  = name
    @value = 0
    @icon  = Subtlext::Icon.new(width, height)
  end # }}}

  ## set_values
  # Update bar values
  # @param [Fixnum]  total    Total value
  # @param [Fixnum]  current  Current value
  ##

  def set_values(total, cur)
    @value = (cur * 100 / total).round rescue 0
    width  = ((@icon.width - 6) * @value / 100).round rescue 0

    # Draw bar
    @icon.clear
    @icon.draw_rect(0, 0, @icon.width - 1, @icon.height - 1, false)
    @icon.draw_rect(3, 3, width, @icon.height - 6, true) if(0 < width)
  end

  ## to_s {{{
  # Convert to string
  ##

  def to_s
    "%-8s %3d%% %s" % [ @name + ":", @value, @icon ]
  end
end # }}}

configure :membar do |s| # {{{
  s.interval = 60

  # Get colors
  colors = Subtlext::Subtle.colors

  # Get config values
  width  = s.config[:width]  || 50
  height = s.config[:height] || 9
  font   = s.config[:font]   || "-*-fixed-*-*-*-*-10-*-*-*-*-*-*-*"
  fg     = Subtlext::Color.new(s.config[:foreground]) rescue colors[:sublets_fg]
  bg     = Subtlext::Color.new(s.config[:background]) rescue colors[:sublets_bg]

  # Create bars
  s.bars     = {
    :mem     => Bar.new("Mem",     width, height),
    :apps    => Bar.new("Apps",    width, height),
    :cached  => Bar.new("Cached",  width, height),
    :buffers => Bar.new("Buffers", width, height),
    :swap    => Bar.new("Swap",    width, height)
  }

  # Window
  s.win = Subtlext::Window.new(:x => 0, :y => 0, :width => 1, :height => 1) do |w|
    w.name        = "Sublet membar"
    w.font        = font
    w.foreground  = fg
    w.background  = bg
    w.border_size = 0
  end
end # }}}

helper do |s| # {{{
  def update
    # Get data and convert to hash
    mem   = IO.read("/proc/meminfo")
    stats = Hash[mem.scan(/([A-Za-z0-9_()]+):\s*([0-9]+) kB/).map { |a|
      [ a[0].to_sym, a[1].to_i ]
    }]

    # Get memory usage
    used = stats[:MemTotal] -
      (stats[:MemFree] + stats[:Buffers] + stats[:Cached])

    # Update bars
    self.bars[:mem].set_values(stats[:MemTotal], used)
    self.bars[:apps].set_values(stats[:MemTotal], stats[:Active])
    self.bars[:cached].set_values(stats[:MemTotal], stats[:Cached])
    self.bars[:buffers].set_values(stats[:MemTotal], stats[:Buffers])
    self.bars[:swap].set_values(stats[:SwapTotal],
      stats[:SwapTotal] - stats[:SwapFree])

    # Set data
    self.data = self.bars[:mem].to_s
  rescue => err
    self.data = "Error?!"
    p err, err.backtrace
  end
end # }}}

on :run do |s| # {{{
  update
end # }}}

on :mouse_over do |s| # {{{
  width  = 0
  height = 0

  # Add bars
  s.bars.each do |name, bar|
    next if(:mem == name)

    height += 14
    width   = s.win.write(7, height, bar.to_s)
  end
  height += 6
  width  += 10

  # Orientation
  screen_geom = s.screen.geometry
  sublet_geom = s.geometry

  # X position
  if(sublet_geom.x + width > screen_geom.x + screen_geom.width)
    x = screen_geom.x + screen_geom.width - width #< x + width > screen width
  else
    x = sublet_geom.x #< Sublet x
  end

  # Y position
  if(sublet_geom.y + height > screen_geom.y + screen_geom.height)
    y = screen_geom.y + screen_geom.height - height #< Bottom
  else
    y = sublet_geom.y + sublet_geom.height #< Top
  end

  s.win.geometry = [ x, y, width, height]

  s.win.show
end # }}}

on :mouse_out do |s| # {{{
  s.win.hide
end # }}}

on :exit do |s| # {{{
  s.win.kill unless(s.win.nil?)
end # }}}
