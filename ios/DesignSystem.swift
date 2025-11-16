import SwiftUI

// MARK: - Design System

extension Color {
    // Primary green colors from spec: #658354 and #4b6043
    static let sproutGreen = Color(hex: "658354")      // Primary green
    static let sproutGreenDark = Color(hex: "4b6043")  // Darker green
    static let sproutGreenLight = Color(hex: "7a9a6a") // Lighter variant
    static let sproutGreenLighter = Color(hex: "8fb37f") // Even lighter
    static let sproutGreenMuted = Color(hex: "9db08d")   // Muted variant
    
    // Accent colors - ensure values are clamped to valid range
    static let sproutYellow = Color(red: 1.0, green: 0.85, blue: 0.3, opacity: 1.0)
    static let sproutOrange = Color(red: 1.0, green: 0.65, blue: 0.25, opacity: 1.0)
    
    // Background colors
    static let sproutBackground = Color(hex: "f5f7f3")
    static let sproutCardBackground = Color(hex: "ffffff")
    
    // Status colors
    static let sproutSuccess = Color(hex: "658354")
    static let sproutWarning = Color(hex: "d4a574")
    static let sproutError = Color(hex: "d87a7a")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        // Ensure values are within valid range to prevent CoreGraphics errors
        let red = max(0.0, min(1.0, Double(r) / 255.0))
        let green = max(0.0, min(1.0, Double(g) / 255.0))
        let blue = max(0.0, min(1.0, Double(b) / 255.0))
        let opacity = max(0.0, min(1.0, Double(a) / 255.0))
        self.init(
            .sRGB,
            red: red,
            green: green,
            blue: blue,
            opacity: opacity
        )
    }
}

extension View {
    func cardStyle() -> some View {
        self
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
    
    func primaryButtonStyle() -> some View {
        self
            .font(.headline)
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
    }
    
    func secondaryButtonStyle() -> some View {
        self
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundColor(.sproutGreen)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color.sproutGreen.opacity(0.1))
            .cornerRadius(12)
    }
}

