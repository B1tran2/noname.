using System.Net.Http;
using System.Security.Cryptography;

namespace Noname.Models;

public class ModelManager
{
    private readonly string _cacheDir;
    private readonly HttpClient _httpClient = new();

    public ModelManager(string cacheDir)
    {
        _cacheDir = cacheDir;
        Directory.CreateDirectory(_cacheDir);
    }

    public async Task<string> EnsureModelAsync(string name, string url, string sha256)
    {
        var target = Path.Combine(_cacheDir, name);
        if (File.Exists(target) && VerifyHash(target, sha256))
        {
            return target;
        }

        var bytes = await _httpClient.GetByteArrayAsync(url);
        await File.WriteAllBytesAsync(target, bytes);

        if (!VerifyHash(target, sha256))
        {
            throw new InvalidOperationException("Model checksum failed.");
        }

        return target;
    }

    private static bool VerifyHash(string path, string sha256)
    {
        using var stream = File.OpenRead(path);
        using var hasher = SHA256.Create();
        var hash = hasher.ComputeHash(stream);
        var actual = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        return actual == sha256.ToLowerInvariant();
    }
}
