import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.hasCompletedOnboarding {
                DashboardView()
            } else {
                OnboardingView()
            }
        }
        .onAppear {
            appState.load()
        }
    }
}
