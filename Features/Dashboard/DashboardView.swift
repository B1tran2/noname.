import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showCapture = false
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                StatusCard(
                    isUnlocked: viewModel.session.isActive && viewModel.remainingSeconds > 0,
                    remainingSeconds: viewModel.remainingSeconds
                )

                VStack(spacing: 8) {
                    Text("Minutos disponibles")
                        .font(.headline)
                    Text("\(viewModel.userState.minutesBalance)")
                        .font(.system(size: 44, weight: .bold))
                }

                Button("Hacer foto para desbloquear") {
                    showCapture = true
                }
                .buttonStyle(.borderedProminent)

                Button("Aplicar bloqueo ahora") {
                    viewModel.applyLockNow()
                }
                .buttonStyle(.bordered)

                HistoryList(entries: viewModel.entries)
                Spacer()
            }
            .padding()
            .navigationTitle("Noname")
            .toolbar {
                NavigationLink("Ajustes") {
                    SettingsView()
                }
            }
            .sheet(isPresented: $showCapture) {
                CaptureFlowView(minutesPerPhoto: appState.minutesPerPhoto) {
                    viewModel.load()
                }
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

struct StatusCard: View {
    let isUnlocked: Bool
    let remainingSeconds: TimeInterval

    var body: some View {
        VStack(spacing: 8) {
            Text(isUnlocked ? "DESBLOQUEADO" : "BLOQUEADO")
                .font(.headline)
                .foregroundColor(isUnlocked ? .green : .red)
            Text(timeString)
                .font(.system(size: 48, weight: .bold, design: .rounded))
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var timeString: String {
        guard isUnlocked else { return "00:00" }
        let minutes = Int(remainingSeconds) / 60
        let seconds = Int(remainingSeconds) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct HistoryList: View {
    let entries: [ProductivityEntry]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Historial")
                .font(.headline)
            if entries.isEmpty {
                Text("Aún no hay fotos validadas.")
                    .foregroundColor(.secondary)
            } else {
                ForEach(entries) { entry in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(entry.category.rawValue)
                            Text(entry.date, style: .date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Text("+\(entry.pointsOrMinutesGranted) min")
                            .font(.caption)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
