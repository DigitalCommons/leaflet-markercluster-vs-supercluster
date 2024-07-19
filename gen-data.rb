#!/bin/env ruby

def write_block(out, num, template)
  str = if out.is_a? String
          File.open(out, 'w')
        else
          out
        end
  
  num.times do |i|
    str << yield(i).pack(template)
  end

  str.close unless out.is_a? String
end

def write_lat_lng(out, num)
  write_block(out, num, "gg") do
    [rand*180-90, rand*360-180]
  end
end


num = (ARGV[0] || 5e5).to_i


points_bin = "points.bin"
puts "Generating #{num} points to #{points_bin}"
write_lat_lng(points_bin, num)

init_points_bin = "initpoints.bin"
num = 50
puts "Generating #{num} points to #{init_points_bin}"
write_lat_lng(init_points_bin, num)

