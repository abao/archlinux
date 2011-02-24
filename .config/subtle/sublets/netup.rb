# Netup sublet file
# Created with sur-0.1.129
class Chart < Subtlext::Icon # {{{
  # Data store
  attr_accessor :data

  ## initialize {{{
  # Initialize chart
  # @param [Fixnum, #read]  width   Icon width
  # @param [Fixnum, #read]  height  Icon height
  ##
  def initialize(width, height)
    super
    @data = []
  end # }}}

  ## push {{{
  # Add data to chart
  # @param [Fixnum, #read]  value  Value to add
  ##
  def push(value)
    if(value.is_a?(Fixnum))
      norm = (value * @height) / 100 # Normalize size

      # Add data and shift last
      @data.push(0 == norm ? 1 : norm)
      @data.shift if((@width / 2) < @data.size)

      render
    end
  end # }}}

  ## render {{{
  # Render chart
  ##
  def render
    i = 0
    clear

    # Draw bars
    ((@width - (@data.size * 2))..@width).step(2) do |x|
      if(i < @data.size)
        ((@height - @data[i])..@height).each do |y|
          draw(x, y)
          draw(x + 1, y)
        end
      end

      i += 1
    end
  end # }}}
end # }}}

configure :netup do |s| # {{{
  s.interval = s.config[:interval] || 30
  s.dev      = s.config[:device] || "wlan0"
  s.limit    = 1000
  s.last     = 0

  s.white    = Subtlext::Subtle.colors[:occupied_fg]
  s.fg       = Subtlext::Subtle.colors[:sublets_fg]

  # Init tx
  s.tx = {
    #:gauge => Chart.new(50, 8),
    :icon  => Subtlext::Icon.new("net_up_02.xbm"),
    :data  => 0
  }
end # }}}

on :run do |s| # {{{
  begin
    # Fetch data
    data_tx = IO.readlines("/sys/class/net/#{@dev}/statistics/tx_bytes").first.to_i

    # Get time
    time   = Time.now.to_i
    delta  = time - @last
    @last = time

    # Get tx per second in kb
    tx = ((data_tx - @tx[:data]) / delta / 1024.0).ceil

    # Store values
    @tx[:data] = data_tx

    # Update gauges
    @tx[:gauge].push(tx * 100 / @limit)
  rescue => error
    p error.to_s
    p error.backtrace
  end

  self.data = "%s%s%s %sMb %s%sk/s" % [
    @white, @tx[:icon], @fg,
    (data_tx / 1000000).to_s.rjust(3, " "),
    @tx[:gauge].to_s,
    tx.to_s.rjust(3, " ")
  ]
end # }}}
