import SwiftUI

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject var vm: SproutViewModel
    @State private var showingMissions = false
    @State private var showingStreak = false
    @State private var sproutScale: CGFloat = 1.0
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Subtle background gradient
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 28) {
                        // Greeting
                        VStack(spacing: 6) {
                            Text("Good afternoon, \(vm.userName) 🌱")
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            Text("\(vm.sproutName) is happy to see you!")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 32)
                        
                        // Sprout + Level Card
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                sproutScale = 0.95
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                    sproutScale = 1.0
                                }
                            }
                        }) {
                            VStack(spacing: 16) {
                                ZStack {
                                    // Outer glow
                                    Circle()
                                        .fill(
                                            RadialGradient(
                                                colors: [
                                                    Color.sproutGreen.opacity(0.3),
                                                    Color.sproutGreen.opacity(0.1),
                                                    Color.clear
                                                ],
                                                center: .center,
                                                startRadius: 20,
                                                endRadius: 100
                                            )
                                        )
                                        .frame(width: 200, height: 200)
                                    
                                    // Main circle with gradient
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [
                                                    Color.sproutGreen.opacity(0.5),
                                                    Color.sproutGreenLight.opacity(0.3),
                                                    Color.sproutGreen.opacity(0.2)
                                                ],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 180, height: 180)
                                        .shadow(color: Color.sproutGreen.opacity(0.3), radius: 20, x: 0, y: 10)
                                    
                                    VStack(spacing: 8) {
                                        Image(systemName: "leaf.fill")
                                            .resizable()
                                            .scaledToFit()
                                            .frame(width: 72, height: 72)
                                            .foregroundStyle(
                                                LinearGradient(
                                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                            )
                                            .shadow(color: Color.sproutGreen.opacity(0.4), radius: 8, x: 0, y: 4)
                                        
                                        Text(vm.sproutName)
                                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                                            .foregroundColor(.sproutGreenDark)
                                    }
                                }
                                .scaleEffect(sproutScale)
                                
                                VStack(spacing: 8) {
                                    Text("Level \(vm.sproutLevel) — Blooming Leaf ✨")
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                        .foregroundColor(.primary)
                                    
                                    // Enhanced XP bar
                                    VStack(spacing: 6) {
                                        ProgressView(value: Double(vm.xp), total: Double(vm.xpToNextLevel))
                                            .progressViewStyle(.linear)
                                            .tint(
                                                LinearGradient(
                                                    colors: [Color.sproutGreen, Color.sproutGreenLight],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                )
                                            )
                                            .scaleEffect(x: 1, y: 2, anchor: .center)
                                            .shadow(color: Color.sproutGreen.opacity(0.3), radius: 4, x: 0, y: 2)
                                        
                                        HStack {
                                            Text("\(vm.xp) XP")
                                                .font(.caption)
                                                .fontWeight(.semibold)
                                                .foregroundColor(.sproutGreenDark)
                                            Spacer()
                                            Text("\(vm.xpToNextLevel) XP")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    .padding(.horizontal, 4)
                                }
                            }
                            .padding(.vertical, 24)
                            .padding(.horizontal, 20)
                            .frame(maxWidth: .infinity)
                            .cardStyle()
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                        
                        // Missions + Streak buttons
                        HStack(spacing: 16) {
                            MissionCardButton(
                                icon: "star.circle.fill",
                                title: "Daily Missions",
                                color: .sproutYellow,
                                action: { showingMissions = true }
                            )
                            
                            MissionCardButton(
                                icon: "flame.fill",
                                title: "Your Streak",
                                color: .sproutOrange,
                                action: { showingStreak = true }
                            )
                        }
                        .padding(.horizontal, 20)
                        
                        // Coins Card
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.sproutYellow.opacity(0.3), Color.sproutYellow.opacity(0.1)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 44, height: 44)
                                    
                                    Image(systemName: "circle.grid.2x2.fill")
                                        .font(.system(size: 20))
                                        .foregroundColor(.sproutYellow)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Sprout Coins")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("\(vm.coins)")
                                        .font(.system(size: 24, weight: .bold, design: .rounded))
                                        .foregroundColor(.primary)
                                }
                                
                                Spacer()
                            }
                            
                            Divider()
                            
                            Button {
                                // open customization later
                            } label: {
                                HStack {
                                    Image(systemName: "paintbrush.fill")
                                        .font(.subheadline)
                                    Text("Customize My Sprout")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .foregroundColor(.primary)
                            }
                        }
                        .padding(20)
                        .cardStyle()
                        .padding(.horizontal, 20)
                        
                        Spacer(minLength: 40)
                    }
                }
            }
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingMissions) {
                MissionsView()
                    .environmentObject(vm)
            }
            .sheet(isPresented: $showingStreak) {
                StreakView()
                    .environmentObject(vm)
            }
        }
    }
}

struct MissionCardButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color.opacity(0.2), color.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 28))
                        .foregroundColor(color)
                }
                
                Text(title)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .cardStyle()
        }
    }
}

// MARK: - Missions View

struct MissionsView: View {
    @EnvironmentObject var vm: SproutViewModel
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(vm.missions) { mission in
                    HStack(spacing: 16) {
                        // Status indicator
                        ZStack {
                            Circle()
                                .fill(mission.isCompleted ? Color.sproutGreen.opacity(0.2) : Color(.secondarySystemBackground))
                                .frame(width: 44, height: 44)
                            
                            Image(systemName: mission.isCompleted ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 24))
                                .foregroundColor(mission.isCompleted ? .sproutGreen : .secondary)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text(mission.title)
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .foregroundColor(.primary)
                            
                            HStack(spacing: 16) {
                                HStack(spacing: 4) {
                                    Image(systemName: "sparkles")
                                        .font(.caption2)
                                    Text("+\(mission.xpReward) XP")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                }
                                .foregroundColor(.sproutGreenDark)
                                
                                HStack(spacing: 4) {
                                    Image(systemName: "circle.grid.2x2.fill")
                                        .font(.caption2)
                                    Text("+\(mission.coinReward) coins")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                }
                                .foregroundColor(.sproutYellow)
                            }
                        }
                        
                        Spacer()
                        
                        if !mission.isCompleted {
                            Button {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    vm.completeMission(mission)
                                }
                            } label: {
                                Text("Complete")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(
                                        LinearGradient(
                                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(12)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(.secondarySystemBackground).opacity(0.5))
                            .padding(.vertical, 4)
                    )
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .navigationTitle("Daily Missions")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Streak View

struct StreakView: View {
    @EnvironmentObject var vm: SproutViewModel
    @State private var flameScale: CGFloat = 1.0
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    Spacer()
                    
                    // Animated flame
                    ZStack {
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [
                                        Color.sproutOrange.opacity(0.3),
                                        Color.sproutOrange.opacity(0.1),
                                        Color.clear
                                    ],
                                    center: .center,
                                    startRadius: 30,
                                    endRadius: 100
                                )
                            )
                            .frame(width: 200, height: 200)
                        
                        Image(systemName: "flame.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.sproutOrange, Color(red: 1.0, green: 0.5, blue: 0.0)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .scaleEffect(flameScale)
                            .shadow(color: Color.sproutOrange.opacity(0.5), radius: 20, x: 0, y: 10)
                    }
                    .onAppear {
                        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                            flameScale = 1.1
                        }
                    }
                    
                    VStack(spacing: 12) {
                        Text("\(vm.streakDays)")
                            .font(.system(size: 64, weight: .bold, design: .rounded))
                            .foregroundColor(.sproutOrange)
                        
                        Text("Day Streak")
                            .font(.system(size: 24, weight: .semibold, design: .rounded))
                            .foregroundColor(.primary)
                        
                        Text("Keep going! Completing at least one mission a day will grow your streak.")
                            .multilineTextAlignment(.center)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 40)
                            .lineSpacing(4)
                    }
                    
                    Spacer()
                }
            }
            .navigationTitle("Your Streak")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

