import SwiftUI

// MARK: - Sprout Logo Component

struct SproutLogo: View {
    var size: CGFloat = 120
    var showGlow: Bool = true
    var animated: Bool = false
    
    @State private var scale: CGFloat = 1.0
    
    var body: some View {
        ZStack {
            if showGlow {
                // Outer glow effect
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.sproutGreen.opacity(0.3),
                                Color.sproutGreen.opacity(0.1),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: size * 0.2,
                            endRadius: size * 0.8
                        )
                    )
                    .frame(width: size * 1.5, height: size * 1.5)
            }
            
            // Logo image
            Image("sprout-logo")
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
                .scaleEffect(animated ? scale : 1.0)
                .shadow(color: Color.sproutGreen.opacity(0.3), radius: 12, x: 0, y: 6)
        }
        .onAppear {
            if animated {
                withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                    scale = 1.05
                }
            }
        }
    }
}

// MARK: - Sprout Logo Variants

struct SproutLogoSmall: View {
    var body: some View {
        SproutLogo(size: 60, showGlow: false, animated: false)
    }
}

struct SproutLogoMedium: View {
    var body: some View {
        SproutLogo(size: 120, showGlow: true, animated: false)
    }
}

struct SproutLogoLarge: View {
    var body: some View {
        SproutLogo(size: 180, showGlow: true, animated: true)
    }
}

// MARK: - App Icon Placeholder (for when logo is used as icon)

struct AppIconView: View {
    var size: CGFloat = 1024
    
    var body: some View {
        ZStack {
            // Background circle matching app colors
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.sproutGreen, Color.sproutGreenDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            // Logo centered
            Image("sprout-logo")
                .resizable()
                .scaledToFit()
                .frame(width: size * 0.7, height: size * 0.7)
                .padding(size * 0.15)
        }
        .frame(width: size, height: size)
    }
}

