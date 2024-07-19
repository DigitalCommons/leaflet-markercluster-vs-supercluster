#!/bin/env ruby

num = (ARGV[0] || 1).to_i
puts "Generating #{num} points"
points = File.open("points.bin", 'w')

num.times do |i|
  points << [rand*180-90, rand*360-180].pack("gg")
end

points.close
