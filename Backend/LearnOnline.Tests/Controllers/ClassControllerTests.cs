using FluentAssertions;
using LearnOnline.Controllers;
using LearnOnline.Models;
using Microsoft.AspNetCore.Mvc;

namespace LearnOnline.Tests.Controllers;

public class ClassControllerTests
{
    private static (LearnOnline.Data.AppDbContext db, Course course, Timetable timetable) Seed()
    {
        var db = TestDbContextFactory.Create();
        var teacher = TestData.MakeUser(role: UserRole.teacher, email: "t@c.com");
        var subject = TestData.MakeSubject();
        var course = TestData.MakeCourse(subject.Id, teacher.Id);
        var timetable = TestData.MakeTimetable(teacher.Id);
        db.Users.Add(teacher);
        db.Subjects.Add(subject);
        db.Courses.Add(course);
        db.Timetables.Add(timetable);
        db.SaveChanges();
        return (db, course, timetable);
    }

    [Fact]
    public async Task GetAll_IncludesCourseName()
    {
        var (db, course, timetable) = Seed();
        course.Name = "Interactive Development";
        db.Classes.Add(TestData.MakeClass(timetable.Id, course.Id));
        await db.SaveChangesAsync();

        var controller = new ClassController(db);
        var result = await controller.GetAll();

        // GetAll returns an anonymous shape, so read its properties via reflection
        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var item = ((IEnumerable<object>)ok.Value!).Should().ContainSingle().Subject;
        object? Prop(string name) => item.GetType().GetProperty(name)!.GetValue(item);
        Prop("CourseName").Should().Be("Interactive Development");
        Prop("TimetableId").Should().Be(timetable.Id);
    }

    [Fact]
    public async Task GetById_Existing()
    {
        var (db, course, timetable) = Seed();
        var cls = TestData.MakeClass(timetable.Id, course.Id);
        db.Classes.Add(cls);
        await db.SaveChangesAsync();

        var controller = new ClassController(db);
        (await controller.GetById(cls.Id)).Value!.Id.Should().Be(cls.Id);
    }

    [Fact]
    public async Task GetById_Missing_NotFound()
    {
        var (db, _, _) = Seed();
        var controller = new ClassController(db);
        (await controller.GetById("missing")).Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Create_Persists()
    {
        var (db, course, timetable) = Seed();
        var controller = new ClassController(db);
        var cls = new Class { TimetableId = timetable.Id, CourseId = course.Id, Room = "B12", DayOfWeek = "Tue" };
        var result = await controller.Create(cls);
        result.Result.Should().BeOfType<CreatedAtActionResult>();
        db.Classes.Should().ContainSingle();
    }

    [Fact]
    public async Task Update_ChangesRoom()
    {
        var (db, course, timetable) = Seed();
        var cls = TestData.MakeClass(timetable.Id, course.Id);
        db.Classes.Add(cls);
        await db.SaveChangesAsync();

        var controller = new ClassController(db);
        var result = await controller.Update(cls.Id, new Class { TimetableId = timetable.Id, CourseId = course.Id, Room = "Z99", DayOfWeek = "Wed" });

        result.Should().BeOfType<NoContentResult>();
        (await db.Classes.FindAsync(cls.Id))!.Room.Should().Be("Z99");
    }

    [Fact]
    public async Task Update_Missing_NotFound()
    {
        var (db, course, timetable) = Seed();
        var controller = new ClassController(db);
        (await controller.Update("missing", new Class { TimetableId = timetable.Id, CourseId = course.Id })).Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_Removes()
    {
        var (db, course, timetable) = Seed();
        var cls = TestData.MakeClass(timetable.Id, course.Id);
        db.Classes.Add(cls);
        await db.SaveChangesAsync();

        var controller = new ClassController(db);
        (await controller.Delete(cls.Id)).Should().BeOfType<NoContentResult>();
        db.Classes.Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_Missing_NotFound()
    {
        var (db, _, _) = Seed();
        var controller = new ClassController(db);
        (await controller.Delete("missing")).Should().BeOfType<NotFoundResult>();
    }
}
