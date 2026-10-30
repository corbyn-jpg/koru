using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LearnOnline.Data;
using LearnOnline.Models;

namespace LearnOnline.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnnouncementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnnouncementController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Announcement/course/{courseId}
        [HttpGet("course/{courseId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetAnnouncementsByCourse(string courseId, [FromQuery] string? userId = null)
        {
            var announcements = await _context.Announcements
                .Where(a => a.CourseId == courseId)
                .Include(a => a.Lecturer)
                .OrderByDescending(a => a.DatePosted)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Preview,
                    a.Label,
                    a.Color,
                    a.DatePosted,
                    lecturerName = a.Lecturer != null ? $"{a.Lecturer.FirstName} {a.Lecturer.LastName}" : "Unknown",
                    isRead = userId != null ? _context.AnnouncementReadStates.Any(ars => ars.AnnouncementId == a.Id && ars.UserId == userId) : false
                })
                .ToListAsync();

            return Ok(announcements);
        }

        // POST: api/Announcement
        [HttpPost]
        [Authorize(Roles = "teacher,admin")]
        public async Task<ActionResult<object>> CreateAnnouncement([FromBody] CreateAnnouncementDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var announcement = new Announcement
            {
                CourseId = dto.CourseId,
                LecturerId = dto.LecturerId,
                Title = dto.Title,
                Preview = dto.Preview,
                Label = dto.Label,
                Color = dto.Color,
                DatePosted = DateTime.UtcNow
            };

            _context.Announcements.Add(announcement);

            // Auto-mark as read for the lecturer who posted it
            _context.AnnouncementReadStates.Add(new AnnouncementReadState
            {
                AnnouncementId = announcement.Id,
                UserId = dto.LecturerId
            });

            await _context.SaveChangesAsync();

            var lecturer = await _context.Users.FindAsync(announcement.LecturerId);
            return CreatedAtAction(nameof(GetAnnouncementsByCourse), new { courseId = dto.CourseId }, new
            {
                announcement.Id,
                announcement.Title,
                announcement.Preview,
                announcement.Label,
                announcement.Color,
                announcement.DatePosted,
                lecturerName = lecturer != null ? $"{lecturer.FirstName} {lecturer.LastName}" : "Unknown",
                isRead = true
            });
        }

        // POST: api/Announcement/{id}/read
        [HttpPost("{id}/read")]
        public async Task<ActionResult> MarkAsRead(string id, [FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return BadRequest("UserId is required.");

            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound("Announcement not found.");

            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
                return NotFound("User not found.");

            var alreadyRead = await _context.AnnouncementReadStates
                .AnyAsync(ars => ars.AnnouncementId == id && ars.UserId == userId);

            if (!alreadyRead)
            {
                var readState = new AnnouncementReadState
                {
                    AnnouncementId = id,
                    UserId = userId
                };
                _context.AnnouncementReadStates.Add(readState);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Announcement marked as read." });
        }

        // POST: api/Announcement/course/{courseId}/read-all
        [HttpPost("course/{courseId}/read-all")]
        public async Task<ActionResult> MarkAllAsRead(string courseId, [FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return BadRequest("UserId is required.");

            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
                return NotFound("User not found.");

            var announcements = await _context.Announcements
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            var readAnnouncementIds = await _context.AnnouncementReadStates
                .Where(ars => ars.UserId == userId && ars.Announcement!.CourseId == courseId)
                .Select(ars => ars.AnnouncementId)
                .ToListAsync();

            var unreadAnnouncements = announcements
                .Where(a => !readAnnouncementIds.Contains(a.Id))
                .ToList();

            foreach (var ann in unreadAnnouncements)
            {
                _context.AnnouncementReadStates.Add(new AnnouncementReadState
                {
                    AnnouncementId = ann.Id,
                    UserId = userId
                });
            }

            if (unreadAnnouncements.Any())
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "All announcements marked as read." });
        }

        // DELETE: api/Announcement/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<ActionResult> DeleteAnnouncement(string id)
        {
            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound();

            _context.Announcements.Remove(announcement);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateAnnouncementDto
    {
        public string CourseId { get; set; } = null!;
        public string LecturerId { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string Preview { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }
}
