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
                                
                                // Inline action buttons (only show if no recipes in recent messages)
                                if !vm.chatMessages.contains(where: { $0.recipe != nil }) {
                                    VStack(spacing: 12) {
                                        ChatActionButton(
                                            icon: "sparkles",
                                            title: "Vegan Cooking Simplified",
                                            subtitle: "Use your groceries + preferences",
                                            color: .sproutGreen
                                        ) {
                                            // Add user message showing they clicked the button
                                            vm.addUserChat("Generate a vegan recipe for me")
                                            // Trigger AI recipe generation
                                            Task {
                                                await vm.generateRecipe()
                                            }
                                        }
                                        
                                        ChatActionButton(
                                            icon: "wand.and.stars",
                                            title: "Savor the Same Flavor",
                                            subtitle: "Veganize an existing dish",
                                            color: .sproutGreenDark
                                        ) {
                                            // Add user message showing they clicked the button
                                            vm.addUserChat("I want to veganize a recipe")
                                            // Add AI prompt message
                                            vm.chatMessages.append(ChatMessage(isUser: false,
                                                                              text: "Great! Please tell me the dish name or paste the recipe text, and I'll veganize it for you using AI! 🧙‍♀️✨"))
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                    .padding(.top, 8)
                                    .padding(.bottom, 24)
                                }
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
                                let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
                                if !text.isEmpty {
                                    vm.addUserChat(text)
                                    let messageText = text // Save before clearing
                                    inputText = ""
                                    
                                    // Check if this looks like a recipe to veganize
                                    let lowerText = messageText.lowercased()
                                    let recipeKeywords = ["recipe", "ingredients", "cook", "make", "prepare", "dish", "meal"]
                                    let isRecipeRequest = recipeKeywords.contains { lowerText.contains($0) } || messageText.count > 50
                                    
                                    Task {
                                        if isRecipeRequest {
                                            // Try to veganize as recipe
                                            await vm.veganizeRecipe(inputText: messageText)
                                        } else {
                                            // Send to AI chat
                                            await vm.sendChatMessage(messageText)
                                        }
                                    }
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
    @EnvironmentObject var vm: SproutViewModel
    
    var body: some View {
        VStack(alignment: message.isUser ? .trailing : .leading, spacing: 8) {
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
                
                VStack(alignment: .leading, spacing: 8) {
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
                    
                    // Recipe card if present
                    if let recipe = message.recipe {
                        RecipeCard(recipe: recipe, onSave: {
                            Task {
                                await vm.saveRecipe(recipe)
                            }
                        })
                    }
                }
                
                if !message.isUser {
                    Spacer(minLength: 60)
                }
            }
        }
    }
}

struct RecipeCard: View {
    let recipe: Recipe
    let onSave: () -> Void
    @State private var showingFullRecipe = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Preview image placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [Color.sproutGreen.opacity(0.3), Color.sproutGreen.opacity(0.15)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 180)
                .overlay(
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.sproutGreen)
                )
            
            VStack(alignment: .leading, spacing: 8) {
                Text(recipe.title)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.sproutGreenDark)
                
                HStack(spacing: 12) {
                    Label(recipe.duration, systemImage: "clock.fill")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 4) {
                        ForEach(recipe.tags.prefix(3), id: \.self) { tag in
                            Text(tag)
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.sproutGreen.opacity(0.15))
                                .foregroundColor(.sproutGreenDark)
                                .cornerRadius(8)
                        }
                    }
                }
            }
            
            HStack(spacing: 12) {
                Button {
                    showingFullRecipe = true
                } label: {
                    Text("View Recipe")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.sproutGreenDark)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.sproutGreen.opacity(0.1))
                        .cornerRadius(12)
                }
                
                Button {
                    onSave()
                } label: {
                    Image(systemName: "star.fill")
                        .font(.subheadline)
                        .foregroundColor(.sproutYellow)
                        .frame(width: 44, height: 44)
                        .background(Color.sproutYellow.opacity(0.15))
                        .clipShape(Circle())
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 4)
        .sheet(isPresented: $showingFullRecipe) {
            RecipeDetailView(recipe: recipe, onSave: onSave)
        }
    }
}

struct RecipeDetailView: View {
    let recipe: Recipe
    let onSave: () -> Void
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Image placeholder
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.sproutGreen.opacity(0.3), Color.sproutGreen.opacity(0.15)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 250)
                        .overlay(
                            Image(systemName: "fork.knife.circle.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.sproutGreen)
                        )
                        .padding(.horizontal)
                    
                    VStack(alignment: .leading, spacing: 20) {
                        Text(recipe.title)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.sproutGreenDark)
                        
                        HStack(spacing: 16) {
                            Label(recipe.duration, systemImage: "clock.fill")
                            HStack(spacing: 6) {
                                ForEach(recipe.tags, id: \.self) { tag in
                                    Text(tag)
                                        .font(.caption)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.sproutGreen.opacity(0.15))
                                        .foregroundColor(.sproutGreenDark)
                                        .cornerRadius(8)
                                }
                            }
                        }
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        
                        Divider()
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Ingredients")
                                .font(.system(size: 20, weight: .semibold, design: .rounded))
                                .foregroundColor(.sproutGreenDark)
                            
                            ForEach(recipe.ingredients, id: \.name) { ingredient in
                                HStack {
                                    Text("•")
                                        .foregroundColor(.sproutGreen)
                                    Text(ingredient.name)
                                    if let amount = ingredient.amount {
                                        Spacer()
                                        Text(amount)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .font(.subheadline)
                            }
                        }
                        
                        Divider()
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Steps")
                                .font(.system(size: 20, weight: .semibold, design: .rounded))
                                .foregroundColor(.sproutGreenDark)
                            
                            ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("\(index + 1)")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(width: 24, height: 24)
                                        .background(
                                            LinearGradient(
                                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .clipShape(Circle())
                                    
                                    Text(step)
                                        .font(.subheadline)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        
                        if let substitutions = recipe.substitutionMap, !substitutions.isEmpty {
                            Divider()
                            
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Substitutions")
                                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                                    .foregroundColor(.sproutGreenDark)
                                
                                ForEach(Array(substitutions.keys), id: \.self) { key in
                                    HStack {
                                        Text(key)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "arrow.right")
                                            .font(.caption)
                                            .foregroundColor(.sproutGreen)
                                        Text(substitutions[key] ?? "")
                                    }
                                    .font(.subheadline)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        onSave()
                        dismiss()
                    } label: {
                        Image(systemName: "star.fill")
                            .foregroundColor(.sproutYellow)
                    }
                }
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

