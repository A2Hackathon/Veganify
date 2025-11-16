import SwiftUI

// MARK: - Cook View (Chat)

struct CookView: View {
    @EnvironmentObject var vm: SproutViewModel
    @State private var inputText: String = ""
    @State private var showingGroceryList = false
    @State private var showingSavedRecipes = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(vm.chatMessages) { message in
                                    ChatBubble(message: message)
                                        .id(message.id)
                                        .padding(.horizontal, 20)
                                        .transition(.asymmetric(
                                            insertion: .move(edge: message.isUser ? .trailing : .leading).combined(with: .opacity),
                                            removal: .opacity
                                        ))
                                }
                                
                                // Inline action buttons
                                VStack(spacing: 12) {
                                    ChatActionButton(
                                        icon: "sparkles",
                                        title: "Vegan Cooking Simplified",
                                        subtitle: "Use your groceries + preferences",
                                        color: .sproutGreen
                                    ) {
                                        vm.chatMessages.append(ChatMessage(isUser: false,
                                                                          text: "I'll create a recipe using your grocery list and preferences."))
                                    }
                                    
                                    ChatActionButton(
                                        icon: "wand.and.stars",
                                        title: "Savor the Same Flavor",
                                        subtitle: "Veganize an existing dish",
                                        color: .sproutGreenDark
                                    ) {
                                        vm.chatMessages.append(ChatMessage(isUser: false,
                                                                          text: "Tell me the dish name or paste the recipe text, and I'll veganize it."))
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 8)
                                .padding(.bottom, 24)
                            }
                        }
                        .onChange(of: vm.chatMessages.count) { _ in
                            if let last = vm.chatMessages.last {
                                withAnimation(.easeOut(duration: 0.3)) {
                                    proxy.scrollTo(last.id, anchor: .bottom)
                                }
                            }
                        }
                    }
                    
                    // Input area
                    VStack(spacing: 0) {
                        Divider()
                        
                        HStack(spacing: 12) {
                            TextField("Type here…", text: $inputText, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(1...3)
                                .padding(.leading, 4)
                            
                            Button {
                                if !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    vm.addUserChat(inputText)
                                    inputText = ""
                                }
                            } label: {
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(
                                        LinearGradient(
                                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .clipShape(Circle())
                                    .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                            }
                            .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            .opacity(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1.0)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color(.systemBackground))
                    }
                }
            }
            .navigationTitle("Cook with Sprout")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 20) {
                        Button {
                            showingGroceryList = true
                        } label: {
                            Image(systemName: "cart.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.sproutGreen)
                        }
                        
                        Button {
                            showingSavedRecipes = true
                        } label: {
                            Image(systemName: "star.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.sproutYellow)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingGroceryList) {
                GroceryListView()
                    .environmentObject(vm)
            }
            .sheet(isPresented: $showingSavedRecipes) {
                SavedRecipesView()
                    .environmentObject(vm)
            }
        }
    }
}

struct ChatBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if !message.isUser {
                // Sprout avatar
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.sproutGreen.opacity(0.3), Color.sproutGreen.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 36, height: 36)
                    
                    Image(systemName: "leaf.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.sproutGreen)
                }
            }
            
            if message.isUser {
                Spacer(minLength: 60)
            }
            
            Text(message.text)
                .font(.system(size: 16, design: .rounded))
                .foregroundColor(message.isUser ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    message.isUser ?
                    LinearGradient(
                        colors: [Color.sproutGreen, Color.sproutGreenDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    LinearGradient(
                        colors: [Color(.secondarySystemBackground), Color(.secondarySystemBackground).opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(20)
                .shadow(color: message.isUser ? Color.sproutGreen.opacity(0.2) : Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
            
            if !message.isUser {
                Spacer(minLength: 60)
            }
        }
    }
}

struct ChatActionButton: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color.opacity(0.2), color.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(color)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(16)
            .cardStyle()
        }
    }
}

