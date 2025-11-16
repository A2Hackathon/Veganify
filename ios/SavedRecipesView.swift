import SwiftUI

// MARK: - Saved Recipes View

struct SavedRecipesView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                List {
                    ForEach(vm.savedRecipes) { recipe in
                        HStack(spacing: 16) {
                            // Recipe image placeholder
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color.sproutGreen.opacity(0.3),
                                                Color.sproutGreen.opacity(0.15)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 80, height: 80)
                                    .shadow(color: Color.sproutGreen.opacity(0.2), radius: 8, x: 0, y: 4)
                                
                                Image(systemName: "fork.knife.circle.fill")
                                    .font(.system(size: 36))
                                    .foregroundStyle(
                                        LinearGradient(
                                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text(recipe.title)
                                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                                    .foregroundColor(.primary)
                                
                                HStack(spacing: 8) {
                                    Image(systemName: "clock.fill")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    Text(recipe.duration)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                
                                HStack(spacing: 6) {
                                    ForEach(recipe.tags.prefix(3), id: \.self) { tag in
                                        Text(tag)
                                            .font(.caption)
                                            .fontWeight(.medium)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                            .background(
                                                LinearGradient(
                                                    colors: [
                                                        Color.sproutGreen.opacity(0.15),
                                                        Color.sproutGreen.opacity(0.1)
                                                    ],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                            )
                                            .foregroundColor(.sproutGreenDark)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 8)
                        .listRowBackground(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(.systemBackground))
                                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
                                .padding(.vertical, 4)
                        )
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Saved Recipes")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

