using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Media.Imaging;
using QRCoder;

namespace Noname;

public partial class MainWindow : Window
{
    private readonly MainViewModel _viewModel = new();

    public MainWindow()
    {
        InitializeComponent();
        DataContext = _viewModel;
    }

    private void OnGeneratePair(object sender, RoutedEventArgs e)
    {
        _viewModel.GeneratePairing();
    }

    private void OnEnroll(object sender, RoutedEventArgs e)
    {
        MessageBox.Show("Enrollment pendiente: captura 3 selfies y genera embeddings locales.", "Noname");
    }

    private void OnPanic(object sender, RoutedEventArgs e)
    {
        _viewModel.TriggerPanicLock();
    }

    private void OnAddDomain(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(DomainInput.Text)) return;
        _viewModel.AddDomain(DomainInput.Text.Trim());
        DomainInput.Clear();
    }
}

public class MainViewModel : INotifyPropertyChanged
{
    private string _currentState = "LOCKED";
    private string _timerDisplay = "00:00";
    private string _pairCode = "--------";
    private BitmapImage? _pairQr;
    private int _points = 0;
    private int _minutesAvailable = 0;

    public string CurrentState
    {
        get => _currentState;
        set => SetField(ref _currentState, value);
    }

    public string TimerDisplay
    {
        get => _timerDisplay;
        set => SetField(ref _timerDisplay, value);
    }

    public string PairCode
    {
        get => _pairCode;
        set => SetField(ref _pairCode, value);
    }

    public BitmapImage? PairQr
    {
        get => _pairQr;
        set => SetField(ref _pairQr, value);
    }

    public int Points
    {
        get => _points;
        set => SetField(ref _points, value);
    }

    public int MinutesAvailable
    {
        get => _minutesAvailable;
        set => SetField(ref _minutesAvailable, value);
    }

    public ObservableCollection<string> BlockedDomains { get; } = new()
    {
        "youtube.com",
        "tiktok.com",
        "instagram.com",
        "twitch.tv",
        "x.com"
    };

    public ObservableCollection<string> Leaderboard { get; } = new()
    {
        "Anonymous 1024 - 120 pts",
        "BOT Alpha - 95 pts",
        "Anonymous 3854 - 80 pts"
    };

    public void GeneratePairing()
    {
        PairCode = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        using var qrGenerator = new QRCodeGenerator();
        using var qrData = qrGenerator.CreateQrCode($"noname://link?code={PairCode}", QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var pngBytes = qrCode.GetGraphic(10);
        PairQr = LoadBitmap(pngBytes);
    }

    public void TriggerPanicLock()
    {
        CurrentState = "LOCKED";
        TimerDisplay = "00:00";
    }

    public void AddDomain(string domain)
    {
        if (!BlockedDomains.Contains(domain))
        {
            BlockedDomains.Add(domain);
        }
    }

    private static BitmapImage LoadBitmap(byte[] data)
    {
        using var stream = new MemoryStream(data);
        var image = new BitmapImage();
        image.BeginInit();
        image.CacheOption = BitmapCacheOption.OnLoad;
        image.StreamSource = stream;
        image.EndInit();
        image.Freeze();
        return image;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void SetField<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (Equals(field, value)) return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}
