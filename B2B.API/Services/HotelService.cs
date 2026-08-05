using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public class HotelService(AppDbContext db, StorageService storage)
{
    private static HotelDto ToDto(Hotel h, int photoCount) => new(
        h.Id,
        h.Name,
        h.Slug,
        h.Description,
        h.IsPublished,
        h.SortOrder,
        h.LogoFile is null ? null : new LogoFileDto(h.LogoFile.Id, h.LogoFile.StoredFileName, h.LogoFile.MimeType),
        photoCount
    );

    // Excludes images living in a hidden web-optimized-copy folder (see
    // Folder.IsSystemGenerated) — those are duplicates of another image, and
    // counting them would roughly double the number shown to the user.
    private IQueryable<MediaFile> PhotoQuery() => db.Files.Where(f =>
        f.Kind == FileKind.Image && !f.IsDeleted
        && (f.FolderId == null || !f.Folder!.IsSystemGenerated));

    private async Task<Dictionary<int, int>> PhotoCountsAsync(List<Hotel> hotels)
    {
        var hotelIds = hotels.Select(h => h.Id).ToList();
        return await PhotoQuery()
            .Where(f => hotelIds.Contains(f.HotelId))
            .GroupBy(f => f.HotelId)
            .Select(g => new { HotelId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.HotelId, x => x.Count);
    }

    private Task<int> PhotoCountAsync(int hotelId) =>
        PhotoQuery().CountAsync(f => f.HotelId == hotelId);

    private async Task<string> UniqueSlugAsync(string name, int? excludeId = null)
    {
        var baseSlug = SlugService.Slugify(name);
        var candidate = baseSlug;
        var n = 1;
        while (await db.Hotels.AnyAsync(h => h.Slug == candidate && (excludeId == null || h.Id != excludeId)))
        {
            candidate = $"{baseSlug}-{++n}";
        }
        return candidate;
    }

    public async Task<List<HotelDto>> ListPublicAsync()
    {
        var hotels = await db.Hotels.Include(h => h.LogoFile)
            .Where(h => h.IsPublished)
            .OrderBy(h => h.SortOrder).ThenBy(h => h.Name)
            .ToListAsync();
        var counts = await PhotoCountsAsync(hotels);
        return [.. hotels.Select(h => ToDto(h, counts.GetValueOrDefault(h.Id)))];
    }

    public async Task<List<HotelDto>> ListAllAsync()
    {
        var hotels = await db.Hotels.Include(h => h.LogoFile)
            .OrderBy(h => h.SortOrder).ThenBy(h => h.Name)
            .ToListAsync();
        var counts = await PhotoCountsAsync(hotels);
        return [.. hotels.Select(h => ToDto(h, counts.GetValueOrDefault(h.Id)))];
    }

    public async Task<Hotel> GetEntityAsync(int id, bool requirePublished = false)
    {
        var hotel = await db.Hotels.Include(h => h.LogoFile).FirstOrDefaultAsync(h => h.Id == id);
        if (hotel is null || (requirePublished && !hotel.IsPublished))
        {
            throw ApiException.NotFound("Otel bulunamadı");
        }
        return hotel;
    }

    public async Task<HotelDto> GetAsync(int id, bool requirePublished = false)
    {
        var hotel = await GetEntityAsync(id, requirePublished);
        return ToDto(hotel, await PhotoCountAsync(id));
    }

    private async Task<MediaFile> SaveLogoFileAsync(int hotelId, int userId, IFormFile file)
    {
        if (!UploadLimits.AllowedImageMimeTypes.Contains(file.ContentType))
        {
            throw ApiException.BadRequest("Logo yalnızca JPEG, PNG veya WEBP olabilir");
        }
        await using (var checkStream = file.OpenReadStream())
        {
            if (!await FileTypeSniffer.MatchesDeclaredKindAsync(checkStream, file.ContentType))
            {
                throw ApiException.BadRequest("Dosya içeriği beklenen türle eşleşmiyor");
            }
        }

        var dir = storage.EnsureHotelDir(hotelId);
        var storedFileName = StorageService.NewStoredFileName(file.FileName);
        await using (var stream = System.IO.File.Create(Path.Combine(dir, storedFileName)))
        {
            await file.CopyToAsync(stream);
        }
        var mediaFile = new MediaFile
        {
            HotelId = hotelId,
            Kind = FileKind.Logo,
            OriginalName = file.FileName,
            StoredFileName = storedFileName,
            MimeType = file.ContentType,
            SizeBytes = file.Length,
            UploadedById = userId,
        };
        db.Files.Add(mediaFile);
        await db.SaveChangesAsync();
        return mediaFile;
    }

    public async Task<HotelDto> CreateAsync(CreateHotelRequest input, int userId, IFormFile? logo)
    {
        var nextSortOrder = input.SortOrder ?? (await db.Hotels.MaxAsync(h => (int?)h.SortOrder) ?? 0) + 1;
        var hotel = new Hotel
        {
            Name = input.Name,
            Slug = await UniqueSlugAsync(input.Name),
            Description = input.Description,
            IsPublished = input.IsPublished,
            SortOrder = nextSortOrder,
            CreatedById = userId,
        };
        db.Hotels.Add(hotel);
        await db.SaveChangesAsync();

        if (logo is not null)
        {
            var logoFile = await SaveLogoFileAsync(hotel.Id, userId, logo);
            hotel.LogoFileId = logoFile.Id;
            await db.SaveChangesAsync();
        }

        return await GetAsync(hotel.Id);
    }

    public async Task<HotelDto> UpdateAsync(int id, UpdateHotelRequest input, bool canPublish)
    {
        var hotel = await GetEntityAsync(id);
        if (input.Name is not null && input.Name != hotel.Name)
        {
            hotel.Name = input.Name;
            hotel.Slug = await UniqueSlugAsync(input.Name, id);
        }
        if (input.Description is not null) hotel.Description = input.Description;
        if (input.IsPublished is not null && input.IsPublished.Value != hotel.IsPublished)
        {
            if (!canPublish) throw ApiException.Forbidden("Otel yayın durumunu değiştirme yetkiniz yok");
            hotel.IsPublished = input.IsPublished.Value;
        }
        if (input.SortOrder is not null) hotel.SortOrder = input.SortOrder.Value;
        hotel.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetAsync(id);
    }

    public async Task<HotelDto> ReplaceLogoAsync(int id, int userId, IFormFile logo)
    {
        var hotel = await GetEntityAsync(id);
        var previousLogoId = hotel.LogoFileId;

        var newLogo = await SaveLogoFileAsync(id, userId, logo);
        hotel.LogoFileId = newLogo.Id;
        await db.SaveChangesAsync();

        if (previousLogoId is not null)
        {
            var previous = await db.Files.FindAsync(previousLogoId.Value);
            if (previous is not null)
            {
                db.Files.Remove(previous);
                await db.SaveChangesAsync();
                var path = storage.AbsoluteFilePath(id, previous.StoredFileName);
                if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            }
        }

        return await GetAsync(id);
    }

    public async Task<HotelDto> RemoveLogoAsync(int id)
    {
        var hotel = await GetEntityAsync(id);

        // Idempotent: if no logo, just return current state
        if (hotel.LogoFileId is null)
        {
            return await GetAsync(id);
        }

        var previousLogoId = hotel.LogoFileId;
        hotel.LogoFileId = null;
        await db.SaveChangesAsync();

        var previous = await db.Files.FindAsync(previousLogoId.Value);
        if (previous is not null)
        {
            db.Files.Remove(previous);
            await db.SaveChangesAsync();
            var path = storage.AbsoluteFilePath(id, previous.StoredFileName);
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }

        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        var hotel = await GetEntityAsync(id);
        db.Hotels.Remove(hotel);
        await db.SaveChangesAsync();
        storage.DeleteHotelDir(id);
    }
}
