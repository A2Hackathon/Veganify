import SwiftUI

// MARK: - Design System

extension Color {
    static let sproutGreen = Color(red: 0.2, green: 0.7, blue: 0.4)
    static let sproutGreenLight = Color(red: 0.3, green: 0.8, blue: 0.5)
    static let sproutGreenDark = Color(red: 0.15, green: 0.6, blue: 0.35)
    static let sproutYellow = Color(red: 1.0, green: 0.8, blue: 0.2)
    static let sproutOrange = Color(red: 1.0, green: 0.6, blue: 0.2)
    static let sproutBackground = Color(red: 0.98, green: 0.99, blue: 0.97)
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

