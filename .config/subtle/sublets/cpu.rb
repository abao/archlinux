# Cpu sublet file
# Created with sur-0.1
configure :cpu do |s|
  s.interval = 30
  s.cpus     = 0
  s.last     = []
  s.delta    = []
  s.sum      = []
  s.icon     = Subtlext::Icon.new("cpu.xbm")

  # Init and count CPUs
  begin
    file = IO.readlines("/proc/stat").join

    file.scan(/cpu(\d+)/) do |num| 
      n           = num.first.to_i
      s.cpus     += 1
      s.last[n]   = 0
      s.delta[n]  = 0
      s.sum[n]    = 0
    end
  rescue
    raise "Init error"
  end
end

on :run do |s|
  begin
    data = ""
    time = Time.now.to_i
    file = IO.readlines("/proc/stat").join

    file.scan(/cpu(\d+) (\d+) (\d+) (\d+)/) do |num, user, nice, system| 
      n          = num.to_i
      s.delta[n] = time - s.last[n]
      s.delta[n] = 1 if(0 == s.delta[n])
      s.last[n]  = time

      sum       = user.to_i + nice.to_i + system.to_i
      use       = ((sum - s.sum[n]) / s.delta[n] / 100.0)
      s.sum[n]  = sum
      percent   = (use * 100.0).ceil % 100

      data << percent.to_s + "% "
    end

    s.data = s.icon + data.chop
  rescue => err # Sanitize to prevent unloading
    s.data = "subtle"
    p err
  end  
end
