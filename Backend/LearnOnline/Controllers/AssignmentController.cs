using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LearnOnline.Data;
using LearnOnline.Models;

namespace LearnOnline.Controllers
{
    // Assignment API – CRUD for course assignments (tasks, projects, exams)
    // Teachers create assignments; students submit work against them
    [ApiController]
    [Route("api/[controller]")]
    public class AssignmentController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AssignmentController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/Assignment – return all assignments with their related Course
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Assignment>>> GetAll()
        {
            return await _context.Assignments
                .Include(a => a.Course)
                .ToListAsync();
        }

        // GET /api/Assignment/{id} – return a single assignment by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<Assignment>> GetById(string id)
        {
            var assignment = await _context.Assignments
                .Include(a => a.Course)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (assignment == null) return NotFound();
            return assignment;
        }

        // GET /api/Assignment/course/{courseId} – return assignments strictly for a course
        [HttpGet("course/{courseId}")]
        public async Task<ActionResult<IEnumerable<Assignment>>> GetByCourseId(string courseId)
        {
            var assignments = await _context.Assignments
                .Include(a => a.Course)
                    .ThenInclude(c => c.Subject)
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.DueDate)
                .ToListAsync();

            return assignments;
        }

        // GET /api/Assignment/student/{studentId} – return assignments with dynamic cohort overrides applied
        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<Assignment>>> GetByStudentId(string studentId)
        {
            // Fetch all active enrollments for the student
            var enrollments = await _context.Enrollments
                .Where(e => e.StudentId == studentId && e.Status == "Active")
                .ToListAsync();

            var enrolledCourseIds = enrollments.Select(e => e.CourseId).ToList();

            // Map CourseId to ClassGroupId for active cohorts
            var courseToCohort = enrollments
                .Where(e => e.ClassGroupId != null)
                .ToDictionary(e => e.CourseId, e => e.ClassGroupId!);

            var cohortIds = courseToCohort.Values.ToList();

            // Fetch any overrides that exist for this student's cohorts
            var overrides = await _context.AssignmentClassOverrides
                .Where(o => cohortIds.Contains(o.ClassGroupId))
                .ToListAsync();

            // Fetch assignments for the student's enrolled courses.
            // Exclude assignments targeted at a specific group that isn't the student's group.
            var assignments = await _context.Assignments
                .Include(a => a.Course)
                    .ThenInclude(c => c!.Subject)
                .Where(a => enrolledCourseIds.Contains(a.CourseId) &&
                    (a.ClassGroupId == null ||
                     cohortIds.Contains(a.ClassGroupId)))
                .ToListAsync();

            // Dynamically apply overrides to each assignment
            foreach (var assignment in assignments)
            {
                if (courseToCohort.TryGetValue(assignment.CourseId, out var cohortId))
                {
                    var ovr = overrides.FirstOrDefault(o => o.AssignmentId == assignment.Id && o.ClassGroupId == cohortId);
                    if (ovr != null)
                    {
                        assignment.DueDate = ovr.DueDate;
                        if (ovr.OpenDate.HasValue) assignment.OpenDate = ovr.OpenDate;
                        if (ovr.CloseDate.HasValue) assignment.CloseDate = ovr.CloseDate;
                    }
                }
            }

            // Return sorted by the overridden due dates
            return assignments.OrderBy(a => a.DueDate).ToList();
        }

        // GET /api/Assignment/{id}/overrides – get all cohort overrides for an assignment
        [HttpGet("{id}/overrides")]
        public async Task<ActionResult<IEnumerable<object>>> GetOverrides(string id)
        {
            var overrides = await _context.AssignmentClassOverrides
                .Include(o => o.ClassGroup)
                .Where(o => o.AssignmentId == id)
                .Select(o => new
                {
                    o.Id,
                    o.AssignmentId,
                    o.ClassGroupId,
                    GroupName = o.ClassGroup != null ? o.ClassGroup.Name : "Unknown Group",
                    o.DueDate,
                    o.OpenDate,
                    o.CloseDate
                })
                .ToListAsync();

            return Ok(overrides);
        }

        // POST /api/Assignment/override – create or update a cohort override for an assignment
        [HttpPost("override")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<ActionResult<AssignmentClassOverride>> CreateOrUpdateOverride(AssignmentClassOverride ovr)
        {
            ovr.DueDate = DateTime.SpecifyKind(ovr.DueDate, DateTimeKind.Utc);
            if (ovr.OpenDate.HasValue) ovr.OpenDate = DateTime.SpecifyKind(ovr.OpenDate.Value, DateTimeKind.Utc);
            if (ovr.CloseDate.HasValue) ovr.CloseDate = DateTime.SpecifyKind(ovr.CloseDate.Value, DateTimeKind.Utc);

            var existing = await _context.AssignmentClassOverrides
                .FirstOrDefaultAsync(o => o.AssignmentId == ovr.AssignmentId && o.ClassGroupId == ovr.ClassGroupId);

            if (existing != null)
            {
                existing.DueDate = ovr.DueDate;
                existing.OpenDate = ovr.OpenDate;
                existing.CloseDate = ovr.CloseDate;
                await _context.SaveChangesAsync();
                return Ok(existing);
            }

            ovr.Id = Guid.NewGuid().ToString();
            _context.AssignmentClassOverrides.Add(ovr);
            await _context.SaveChangesAsync();
            return Ok(ovr);
        }

        // DELETE /api/Assignment/override/{id} – delete an assignment cohort override
        [HttpDelete("override/{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> DeleteOverride(string id)
        {
            var ovr = await _context.AssignmentClassOverrides.FindAsync(id);
            if (ovr == null) return NotFound();
            _context.AssignmentClassOverrides.Remove(ovr);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/Assignment/teacher/{teacherId} – return all assignments for courses taught by this teacher
        [HttpGet("teacher/{teacherId}")]
        public async Task<ActionResult<IEnumerable<Assignment>>> GetByTeacherId(string teacherId)
        {
            var taughtCourseIds = await _context.Courses
                .Where(c => c.TeacherId == teacherId)
                .Select(c => c.Id)
                .ToListAsync();

            var assignments = await _context.Assignments
                .Include(a => a.Course)
                    .ThenInclude(c => c.Subject)
                .Where(a => taughtCourseIds.Contains(a.CourseId))
                .OrderBy(a => a.DueDate)
                .ToListAsync();

            return assignments;
        }

        // POST /api/Assignment – create a new assignment for a course
        [HttpPost]
        [Authorize(Roles = "teacher,admin")]
        public async Task<ActionResult<Assignment>> Create(Assignment assignment)
        {
            assignment.Id = Guid.NewGuid().ToString();
            assignment.CreatedAt = DateTime.UtcNow;
            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
        }

        // PUT /api/Assignment/{id} – update an existing assignment's details
        [HttpPut("{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> Update(string id, Assignment updated)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return NotFound();

            assignment.Title = updated.Title;
            assignment.Description = updated.Description;
            assignment.DueDate = updated.DueDate;
            assignment.OpenDate = updated.OpenDate;
            assignment.CloseDate = updated.CloseDate;
            assignment.MaxPoints = updated.MaxPoints;
            assignment.CourseId = updated.CourseId;
            assignment.Type = updated.Type;
            assignment.IsClosed = updated.IsClosed;
            assignment.AllowMultipleAttempts = updated.AllowMultipleAttempts;
            assignment.QuizQuestionsJson = updated.QuizQuestionsJson;
            assignment.ExternalToolName = updated.ExternalToolName;
            assignment.ExternalToolUrl = updated.ExternalToolUrl;
            assignment.ClassGroupId = updated.ClassGroupId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH /api/Assignment/{id}/close – toggle the closed state of an assignment
        [HttpPatch("{id}/close")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> Close(string id)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return NotFound();
            assignment.IsClosed = !assignment.IsClosed;
            await _context.SaveChangesAsync();
            return Ok(new { isClosed = assignment.IsClosed });
        }

        // DELETE /api/Assignment/{id} – permanently remove an assignment
        [HttpDelete("{id}")]
        [Authorize(Roles = "teacher,admin")]
        public async Task<IActionResult> Delete(string id)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return NotFound();
            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
