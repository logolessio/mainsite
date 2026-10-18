import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Shrinks a chosen picture to what the site accepts (512 square for a profile picture, 1600 by 900 for a banner), cropping to fill, and re-encodes it
/// as a JPEG under 420 KB. Re-encoding also strips any hidden data from the original file.
enum ImagePrep {
    static func jpeg(from data: Data, width: Int, height: Int) -> Data? {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
        let cs = CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
        ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        let scale = max(CGFloat(width) / CGFloat(img.width), CGFloat(height) / CGFloat(img.height))
        let w = CGFloat(img.width) * scale, h = CGFloat(img.height) * scale
        ctx.interpolationQuality = .high
        ctx.draw(img, in: CGRect(x: (CGFloat(width) - w) / 2, y: (CGFloat(height) - h) / 2, width: w, height: h))
        guard let out = ctx.makeImage() else { return nil }
        for q in [0.88, 0.78, 0.66, 0.54, 0.42, 0.32] {
            let buf = NSMutableData()
            guard let dest = CGImageDestinationCreateWithData(buf, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
            CGImageDestinationAddImage(dest, out, [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary)
            guard CGImageDestinationFinalize(dest) else { return nil }
            if buf.length <= 420 * 1024 { return buf as Data }
        }
        return nil
    }
}
