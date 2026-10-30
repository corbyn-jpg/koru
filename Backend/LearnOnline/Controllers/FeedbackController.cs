using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LearnOnline.Data;
using LearnOnline.Models;

namespace LearnOnline.Controllers
{
    // Feedback API – CRUD for teacher feedback on student submissions
    // Each feedback entry is tied to a specific Submission and Teacher
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly AppDbContext _context;
        public FeedbackController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/Feedback – return all feedback with their Submission and Teacher
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetAll()
        {
            return await _context.Feedbacks
                .Include(f => f.Submission)
                .Include(f => f.Teacher)
                .ToListAsync();
        }

        // GET /api/Feedback/{id} – return a single feedback entry by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<Feedback>> GetById(string id)
        {
            var feedback = await _context.Feedbacks
                .Include(f => f.Submission)
                .Include(f => f.Teacher)
                .FirstOrDefaultAsync(f => f.Id == id);
            if (feedback == null) return NotFound();
            return feedback;
        }

        // POST /api/Feedback – create new feedback on a submission
        [HttpPost]
        [Authorize(Roles = "teacher,admin")]
        public async Task<ActionResult<Feedback>> Create(Feedback feedback)
        {
            feedback.Id = Guid.NewGuid().ToString();
            feedback.CreatedAt = DateTime.UtcNow;
            _context.Feedbacks.Add(feedback);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = feedback.Id }, feedback);
        }

        // PUT /api/Feedback/{id} – update the feedback content or reassign it
        [HttpPut("{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> Update(string id, Feedback updated)
        {
            var feedback = await _context.Feedbacks.FindAsync(id);
            if (feedback == null) return NotFound();

            feedback.Content = updated.Content;
            feedback.SubmissionId = updated.SubmissionId;
            feedback.TeacherId = updated.TeacherId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/Feedback/{id} – permanently remove a feedback entry
        [HttpDelete("{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> Delete(string id)
        {
            var feedback = await _context.Feedbacks.FindAsync(id);
            if (feedback == null) return NotFound();
            _context.Feedbacks.Remove(feedback);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
