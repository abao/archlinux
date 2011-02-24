# memorybar sublet file
# Created with sur-0.2.155
require "subtle/dominikh/graph"
class RAM
  # @return Hash{Symbol => Numeric} A table of information about
  # the current RAM usage. Keys include :total, :free, :buffers,
  # :cached, :used, :total and :percentage
  def self.data
    s = File.read("/proc/meminfo")

    total   = s.match(/MemTotal:\s*(\d+)\s*kB/)[1].to_i || 0
    free    = s.match(/MemFree:\s*(\d+)\s*kB/)[1].to_i  || 0
    buffers = s.match(/Buffers:\s*(\d+)\s*kB/)[1].to_i  || 0
    cached  = s.match(/Cached:\s*(\d+)\s*kB/)[1].to_i   || 0

    used    = (total - (free + buffers + cached)) / 1024.to_f
    total   = total / 1024.to_f

    {
      :total => total,
      :free => free,
      :buffers => buffers,
      :cached => cached,
      :used => used,
      :total => total,
      :percentage => (used/total) * 100
    }
  end
end

class MemoryBar < Dominikh::Bar
  include Dominikh::ColoredGraph
  def data
    RAM.data
  end

  def value
    data[:percentage]
  end
end

configure :memorybar do |s|
  s.interval = 5
  s.graph = MemoryBar.new(20, s.geometry.height, :horizontal)
end

on :run do |s|
  s.data = s.graph + s.graph.data[:used].round(2).to_s + "MB / " + s.graph.data[:total].round(2).to_s + "MB"
end
