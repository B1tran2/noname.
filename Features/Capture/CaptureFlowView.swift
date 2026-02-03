import SwiftUI

struct CaptureFlowView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CaptureViewModel()
    @State private var showCamera = true

    let minutesPerPhoto: Int
    let onComplete: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if let image = viewModel.selectedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 240)
                        .cornerRadius(12)
                } else {
                    Text("Haz una foto de algo productivo.")
                        .foregroundColor(.secondary)
                }

                Form {
                    Picker("Categoría", selection: $viewModel.selectedCategory) {
                        ForEach(ProductivityCategory.allCases) { category in
                            Text(category.rawValue).tag(category)
                        }
                    }
                    TextField("¿Qué has hecho? (opcional)", text: $viewModel.note)
                }

                Button("Validar y desbloquear") {
                    Task {
                        await viewModel.validate(
                            minutesPerPhoto: minutesPerPhoto,
                            saveToLibrary: appState.savePhotosToLibrary
                        )
                        if viewModel.isValidated {
                            onComplete()
                            dismiss()
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.selectedImage == nil)

                Spacer()
            }
            .navigationTitle("Confirmar foto")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Repetir") { showCamera = true }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPicker(image: $viewModel.selectedImage)
            }
            .alert("Error", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { _ in viewModel.errorMessage = nil }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}
