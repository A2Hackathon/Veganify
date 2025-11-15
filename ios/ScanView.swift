import SwiftUI

// MARK: - Scan View

struct ScanView: View {
    @EnvironmentObject var vm: SproutViewModel
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var sourceType: UIImagePickerController.SourceType = .camera
    
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
                    if let image = selectedImage {
                        ScrollView {
                            VStack(spacing: 20) {
                                // Scanned image
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxWidth: .infinity)
                                    .cornerRadius(20)
                                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                                    .padding(.horizontal, 20)
                                    .padding(.top, 20)
                                
                                // Results card
                                VStack(alignment: .leading, spacing: 20) {
                                    HStack {
                                        Image(systemName: "checkmark.seal.fill")
                                            .font(.title3)
                                            .foregroundColor(.sproutGreen)
                                        Text("Scan Results")
                                            .font(.system(size: 22, weight: .bold, design: .rounded))
                                        Spacer()
                                    }
                                    
                                    VStack(spacing: 16) {
                                        IngredientResultRow(
                                            color: .red,
                                            icon: "xmark.circle.fill",
                                            name: "Gelatin",
                                            detail: "Not allowed for your eating style."
                                        )
                                        
                                        IngredientResultRow(
                                            color: .sproutYellow,
                                            icon: "exclamationmark.triangle.fill",
                                            name: "Natural Flavors",
                                            detail: "May contain animal-derived components."
                                        )
                                        
                                        IngredientResultRow(
                                            color: .sproutGreen,
                                            icon: "checkmark.circle.fill",
                                            name: "Potato Starch",
                                            detail: "Safe for you."
                                        )
                                    }
                                    
                                    Divider()
                                    
                                    // Alternative suggestion
                                    VStack(alignment: .leading, spacing: 12) {
                                        Text("Gelatin is not allowed.")
                                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                                            .foregroundColor(.primary)
                                        
                                        Button {
                                            // open prompt
                                        } label: {
                                            HStack {
                                                Image(systemName: "lightbulb.fill")
                                                    .font(.subheadline)
                                                Text("Suggest an alternative product")
                                                    .font(.subheadline)
                                                    .fontWeight(.semibold)
                                                Spacer()
                                                Image(systemName: "arrow.right")
                                                    .font(.caption)
                                            }
                                            .foregroundColor(.white)
                                            .padding(.vertical, 14)
                                            .padding(.horizontal, 16)
                                            .frame(maxWidth: .infinity)
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
                                .padding(24)
                                .cardStyle()
                                .padding(.horizontal, 20)
                                .padding(.bottom, 24)
                            }
                        }
                    } else {
                        VStack(spacing: 32) {
                            Spacer()
                            
                            // Empty state
                            VStack(spacing: 20) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            RadialGradient(
                                                colors: [
                                                    Color.sproutGreen.opacity(0.2),
                                                    Color.sproutGreen.opacity(0.1),
                                                    Color.clear
                                                ],
                                                center: .center,
                                                startRadius: 30,
                                                endRadius: 100
                                            )
                                        )
                                        .frame(width: 200, height: 200)
                                    
                                    Image(systemName: "camera.viewfinder")
                                        .font(.system(size: 80))
                                        .foregroundStyle(
                                            LinearGradient(
                                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                }
                                
                                VStack(spacing: 8) {
                                    Text("Scan Ingredients")
                                        .font(.system(size: 28, weight: .bold, design: .rounded))
                                    Text("Scan an ingredient list or menu to see if it fits your preferences.")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 40)
                                }
                            }
                            
                            // Action buttons
                            VStack(spacing: 16) {
                                ScanButton(
                                    title: "Take a Photo",
                                    icon: "camera.fill",
                                    color: .sproutGreen
                                ) {
                                    sourceType = .camera
                                    showingImagePicker = true
                                }
                                
                                ScanButton(
                                    title: "Upload Image",
                                    icon: "photo.on.rectangle.angled",
                                    color: .sproutGreenDark
                                ) {
                                    sourceType = .photoLibrary
                                    showingImagePicker = true
                                }
                            }
                            .padding(.horizontal, 20)
                            
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Scan")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(image: $selectedImage, sourceType: sourceType)
            }
        }
    }
}

struct ScanButton: View {
    let title: String
    let icon: String
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
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(color)
                }
                
                Text(title)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(20)
            .cardStyle()
        }
    }
}

struct IngredientResultRow: View {
    let color: Color
    let icon: String
    let name: String
    let detail: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(color)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text(name)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                Text(detail)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.vertical, 4)
    }
}

