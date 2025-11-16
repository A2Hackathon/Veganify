import SwiftUI

// MARK: - Grocery List View

struct GroceryListView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var newItemName: String = ""
    @State private var selectedCategory: GroceryCategory = .produce
    
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
                    // Add items / scan area
                    VStack(spacing: 16) {
                        // Add item input
                        HStack(spacing: 12) {
                            TextField("Add an item…", text: $newItemName)
                                .textFieldStyle(.roundedBorder)
                                .font(.subheadline)
                            
                            Menu {
                                Picker("Category", selection: $selectedCategory) {
                                    ForEach(GroceryCategory.allCases) { cat in
                                        Text(cat.rawValue).tag(cat)
                                    }
                                }
                            } label: {
                                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.sproutGreen)
                            }
                            
                            Button {
                                if !newItemName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    Task {
                                        await vm.addGroceryItem(name: newItemName, category: selectedCategory.rawValue)
                                    }
                                    newItemName = ""
                                }
                            } label: {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(.sproutGreen)
                            }
                            .disabled(newItemName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                        
                        // Quick scan button
                        HStack(spacing: 12) {
                            Button {
                                // Scan Receipt action placeholder
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "doc.text.viewfinder")
                                        .font(.caption)
                                    Text("Scan Receipt")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                }
                                .foregroundColor(.sproutGreenDark)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.sproutGreenDark.opacity(0.1))
                                .cornerRadius(12)
                            }
                            
                            Spacer()
                        }
                    }
                    .padding(20)
                    .background(Color(.systemBackground))
                    
                    Divider()
                    
                    // List by category
                    List {
                        ForEach(GroceryCategory.allCases) { category in
                            Section {
                                ForEach(vm.groceryItems.filter { $0.category == category }) { item in
                                    HStack(spacing: 16) {
                                        Button {
                                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                vm.toggleGroceryItem(item)
                                            }
                                        } label: {
                                            ZStack {
                                                Circle()
                                                    .fill(item.isChecked ? Color.sproutGreen.opacity(0.2) : Color(.secondarySystemBackground))
                                                    .frame(width: 32, height: 32)
                                                
                                                Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                                                    .font(.system(size: 20))
                                                    .foregroundColor(item.isChecked ? .sproutGreen : .secondary)
                                            }
                                        }
                                        
                                        Text(item.name)
                                            .font(.system(size: 16, design: .rounded))
                                            .strikethrough(item.isChecked)
                                            .foregroundColor(item.isChecked ? .secondary : .primary)
                                        
                                        Spacer()
                                    }
                                    .padding(.vertical, 4)
                                }
                            } header: {
                                Text(category.rawValue)
                                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                                    .foregroundColor(.sproutGreenDark)
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Grocery List")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // open Saved Recipes
                    } label: {
                        Image(systemName: "star.fill")
                            .foregroundColor(.sproutYellow)
                    }
                }
            }
        }
    }
}

