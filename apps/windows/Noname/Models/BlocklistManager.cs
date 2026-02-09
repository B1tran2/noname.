using System.Diagnostics;

namespace Noname.Models;

public class BlocklistManager
{
    private readonly string _hostsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.System),
        "drivers",
        "etc",
        "hosts");

    private const string MarkerStart = "# NONAME START";
    private const string MarkerEnd = "# NONAME END";

    public void ApplyBlocklist(IEnumerable<string> domains)
    {
        var entries = string.Join(Environment.NewLine, domains.Select(d => $"127.0.0.1 {d}"));
        var content = File.Exists(_hostsPath) ? File.ReadAllText(_hostsPath) : string.Empty;
        var updated = StripBlocklist(content);
        updated += $"\n{MarkerStart}\n{entries}\n{MarkerEnd}\n";
        File.WriteAllText(_hostsPath, updated);
    }

    public bool HasAdminAccess()
    {
        try
        {
            using var stream = File.Open(_hostsPath, FileMode.Open, FileAccess.ReadWrite);
            return stream.CanWrite;
        }
        catch
        {
            return false;
        }
    }

    public void OpenProxyInstructions()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "https://support.microsoft.com/windows",
            UseShellExecute = true
        });
    }

    private static string StripBlocklist(string content)
    {
        var startIndex = content.IndexOf(MarkerStart, StringComparison.Ordinal);
        var endIndex = content.IndexOf(MarkerEnd, StringComparison.Ordinal);
        if (startIndex < 0 || endIndex < 0 || endIndex < startIndex)
        {
            return content;
        }

        return content.Remove(startIndex, endIndex - startIndex + MarkerEnd.Length);
    }
}
