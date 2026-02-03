import SwiftUI
import FamilyControls

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = OnboardingViewModel()
    @State private var showPicker = false

    var body: some View {
        TabView {
            OnboardingPage(
                title: "Bloqueo por defecto",
                description: "Noname bloquea tus apps elegidas hasta que valides una foto productiva."
            )

            OnboardingPage(
                title: "Privacidad",
                description: "Todo se guarda localmente. No subimos fotos ni datos a la nube."
            )

            VStack(spacing: 24) {
                OnboardingPage(
                    title: "Configurar bloqueo",
                    description: "Elige las apps que quieres restringir."
                )
                Button("Configurar bloqueo") {
                    showPicker = true
                }
                .buttonStyle(.borderedProminent)

                Button("Continuar") {
                    viewModel.saveSelection()
                    appState.markOnboardingCompleted()
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 24)
        }
        .tabViewStyle(.page)
        .task {
            await viewModel.requestAuthorization()
        }
        .familyActivityPicker(
            isPresented: $showPicker,
            selection: $viewModel.selection
        )
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

struct OnboardingPage: View {
    let title: String
    let description: String

    var body: some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.title)
                .bold()
            Text(description)
                .font(.body)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 24)
    }
}
