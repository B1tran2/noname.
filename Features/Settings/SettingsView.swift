import SwiftUI
import FamilyControls

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showPicker = false
    @State private var showResetAlert = false

    var body: some View {
        Form {
            Section("Preferencias") {
                Toggle("Guardar foto en Carrete", isOn: $viewModel.savePhotos)
                    .onChange(of: viewModel.savePhotos) { _, _ in
                        viewModel.persistSettings()
                        appState.updateSavePhotos(viewModel.savePhotos)
                    }

                Stepper(value: $viewModel.minutesPerPhoto, in: 5...60, step: 5) {
                    Text("Minutos por foto: \(viewModel.minutesPerPhoto)")
                }
                .onChange(of: viewModel.minutesPerPhoto) { _, _ in
                    viewModel.persistSettings()
                    appState.updateMinutesPerPhoto(viewModel.minutesPerPhoto)
                }
            }

            Section("Apps bloqueadas") {
                Button("Ver/editar selección") {
                    showPicker = true
                }
            }

            Section("Reiniciar") {
                Button("Reset total", role: .destructive) {
                    showResetAlert = true
                }
            }
        }
        .navigationTitle("Ajustes")
        .task {
            await viewModel.requestAuthorization()
        }
        .familyActivityPicker(isPresented: $showPicker, selection: $viewModel.selection)
        .onChange(of: viewModel.selection) { _, _ in
            viewModel.persistSelection()
        }
        .alert("Confirmar reset", isPresented: $showResetAlert) {
            Button("Cancelar", role: .cancel) {}
            Button("Reset", role: .destructive) {
                viewModel.resetAll()
                appState.load()
            }
        } message: {
            Text("Se borrarán datos locales y configuración.")
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
