import SwiftUI

struct ContentView: View {
    @StateObject private var webViewModel = WebViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()

    var body: some View {
        ZStack {
            WebView(model: webViewModel)
                .ignoresSafeArea(.keyboard, edges: .bottom)

            if webViewModel.isLoading {
                LoadingOverlay(progress: webViewModel.progress)
            }

            if !networkMonitor.isConnected {
                NativeStateOverlay(
                    title: "No Internet Connection",
                    message: "Connect to the internet to access Talme HRMS.",
                    actionTitle: "Retry",
                    action: webViewModel.reload
                )
            } else if let errorMessage = webViewModel.errorMessage {
                NativeStateOverlay(
                    title: "Unable to Load HRMS",
                    message: errorMessage,
                    actionTitle: "Retry",
                    action: webViewModel.reload
                )
            }
        }
        .safeAreaInset(edge: .bottom) {
            NativeToolbar(model: webViewModel)
        }
        .sheet(item: $webViewModel.shareItem) { shareItem in
            ActivityView(items: [shareItem.url])
        }
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected && webViewModel.currentURL == nil {
                webViewModel.loadHome()
            }
        }
    }
}

private struct LoadingOverlay: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 16) {
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(width: 96, height: 96)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            VStack(spacing: 8) {
                Text("Talme HRMS")
                    .font(.headline)
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(Color(red: 0.79, green: 0.55, blue: 0.25))
                    .frame(width: 190)
            }
        }
        .padding(28)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.16), radius: 24, x: 0, y: 12)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Talme HRMS is loading")
    }
}

private struct NativeStateOverlay: View {
    let title: String
    let message: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(width: 82, height: 82)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            VStack(spacing: 8) {
                Text(title)
                    .font(.title3.weight(.semibold))
                    .multilineTextAlignment(.center)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(actionTitle, action: action)
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0.79, green: 0.55, blue: 0.25))
        }
        .padding(28)
        .frame(maxWidth: 360)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.18), radius: 28, x: 0, y: 14)
        .padding(24)
    }
}

private struct NativeToolbar: View {
    @ObservedObject var model: WebViewModel

    var body: some View {
        HStack(spacing: 18) {
            Button {
                model.goBack()
            } label: {
                Label("Back", systemImage: "chevron.left")
            }
            .disabled(!model.canGoBack)

            Button {
                model.goForward()
            } label: {
                Label("Forward", systemImage: "chevron.right")
            }
            .disabled(!model.canGoForward)

            Spacer()

            Button {
                model.loadHome()
            } label: {
                Label("Home", systemImage: "house")
            }

            Button {
                model.reload()
            } label: {
                Label("Reload", systemImage: "arrow.clockwise")
            }
        }
        .labelStyle(.iconOnly)
        .font(.headline)
        .padding(.horizontal, 22)
        .padding(.vertical, 10)
        .background(.bar)
    }
}

#Preview {
    ContentView()
}
