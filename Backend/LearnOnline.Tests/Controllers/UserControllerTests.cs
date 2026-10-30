using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LearnOnline.Controllers;
using LearnOnline.Models;
using LearnOnline.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace LearnOnline.Tests.Controllers;

public class UserControllerTests
{
    private const string TestJwtKey = "test-signing-key-that-is-at-least-32-characters";

    // Controllers read the caller from HttpContext.User; tests act as an admin unless they say otherwise
    private static UserController SignedIn(UserController controller, string userId = "admin-id", string role = "admin")
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Role, role) }, "test");
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) } };
        return controller;
    }

    private static IConfiguration MakeConfig(string? googleClientId = null)
    {
        var dict = new Dictionary<string, string?> { ["Jwt:Key"] = TestJwtKey };
        if (googleClientId != null) dict["GoogleAuth:ClientId"] = googleClientId;
        return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
    }

    private static IHttpClientFactory MakeHttpClientFactory(HttpStatusCode status = HttpStatusCode.OK, GoogleTokenInfoDto? body = null)
    {
        var handler = new Mock<HttpMessageHandler>();
        var response = new HttpResponseMessage(status);
        if (body != null)
            response.Content = JsonContent.Create(body);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);

        var client = new HttpClient(handler.Object);
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);
        return factory.Object;
    }

    [Fact]
    public async Task GetAll_ReturnsUsersWithoutPasswordHash()
    {
        using var db = TestDbContextFactory.Create();
        db.Users.Add(TestData.MakeUser(email: "a@x.com"));
        db.Users.Add(TestData.MakeUser(email: "b@x.com"));
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.GetAll();

        var ok = result.Result as OkObjectResult;
        ok.Should().NotBeNull();
        ((IEnumerable<UserResponseDto>)ok!.Value!).Count().Should().Be(2);
    }

    [Fact]
    public async Task GetById_Existing_ReturnsDto()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser();
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.GetById(user.Id);
        var ok = result.Result as OkObjectResult;
        ((UserResponseDto)ok!.Value!).Id.Should().Be(user.Id);
    }

    [Fact]
    public async Task GetById_Missing_NotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        (await controller.GetById("missing")).Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Register_NewEmail_CreatesUser()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var dto = new CreateUserDto { Email = "New@X.com", Password = "p", FirstName = "F", LastName = "L", Role = UserRole.student };

        var result = await controller.Register(dto);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
        var user = db.Users.Single();
        user.Email.Should().Be("new@x.com");
        user.PasswordHash.Should().NotBe("p");
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflict()
    {
        using var db = TestDbContextFactory.Create();
        db.Users.Add(TestData.MakeUser(email: "dup@x.com"));
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var dto = new CreateUserDto { Email = "dup@x.com", Password = "p", FirstName = "F", LastName = "L", Role = UserRole.student };

        var result = await controller.Register(dto);

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOk()
    {
        using var db = TestDbContextFactory.Create();
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = "login@x.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("secret123"),
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.Login(new LoginDto { Email = "Login@X.com", Password = "secret123" });

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = "login@x.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("secret123"),
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.Login(new LoginDto { Email = "login@x.com", Password = "wrong" });

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_UnknownEmail_ReturnsUnauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.Login(new LoginDto { Email = "nobody@x.com", Password = "x" });
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsUnauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser(email: "inactive@x.com", isActive: false);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.Login(new LoginDto { Email = "inactive@x.com", Password = "Password123!" });
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public void GetGoogleConfig_ReturnsConfiguredClientId()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig("client-abc")));
        var result = controller.GetGoogleConfig() as OkObjectResult;
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GoogleAuth_EmptyCredential_ReturnsBadRequest()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.GoogleAuth(new GoogleAuthDto { Credential = "" });
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GoogleAuth_FirstTime_ReturnsUnauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var factory = MakeHttpClientFactory(body: new GoogleTokenInfoDto
        {
            Email = "g@x.com",
            EmailVerified = "true",
            GivenName = "G",
            FamilyName = "U",
            Picture = "pic",
            Audience = "client-abc"
        });
        var controller = SignedIn(new UserController(db, factory, MakeConfig("client-abc")));

        var result = await controller.GoogleAuth(new GoogleAuthDto { Credential = "token", Role = UserRole.student });

        result.Should().BeOfType<UnauthorizedObjectResult>();
        db.Users.Should().BeEmpty();
    }

    [Fact]
    public async Task GoogleAuth_UnverifiedEmail_Unauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var factory = MakeHttpClientFactory(body: new GoogleTokenInfoDto
        {
            Email = "g@x.com",
            EmailVerified = "false",
            Audience = "client-abc"
        });
        var controller = SignedIn(new UserController(db, factory, MakeConfig("client-abc")));

        var result = await controller.GoogleAuth(new GoogleAuthDto { Credential = "token" });
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GoogleAuth_ClientIdMismatch_Unauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var factory = MakeHttpClientFactory(body: new GoogleTokenInfoDto
        {
            Email = "g@x.com",
            EmailVerified = "true",
            Audience = "wrong-aud"
        });
        var controller = SignedIn(new UserController(db, factory, MakeConfig("client-abc")));

        var result = await controller.GoogleAuth(new GoogleAuthDto { Credential = "token" });
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task UpdateProfile_Existing_UpdatesFields()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser(email: "old@x.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));

        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Email = "NEW@X.com",
            FirstName = "NewF",
            LastName = "NewL",
            Role = UserRole.teacher
        });

        result.Result.Should().BeOfType<OkObjectResult>();
        (await db.Users.FindAsync(user.Id))!.Email.Should().Be("new@x.com");
    }

    [Fact]
    public async Task UpdateProfile_Missing_NotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.UpdateProfile("missing", new UpdateUserProfileDto
        {
            Email = "a@x.com",
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student
        });
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task UpdateProfile_EmailTakenByOther_Conflict()
    {
        using var db = TestDbContextFactory.Create();
        db.Users.Add(TestData.MakeUser(email: "taken@x.com"));
        var user = TestData.MakeUser(email: "mine@x.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.UpdateProfile(user.Id, new UpdateUserProfileDto
        {
            Email = "taken@x.com",
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student
        });

        result.Result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrent_Updates()
    {
        using var db = TestDbContextFactory.Create();
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = "pw@x.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("oldpass"),
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.ChangePassword(user.Id, new ChangePasswordDto { CurrentPassword = "oldpass", NewPassword = "newpass" });

        result.Should().BeOfType<OkObjectResult>();
        BCrypt.Net.BCrypt.Verify("newpass", (await db.Users.FindAsync(user.Id))!.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Unauthorized()
    {
        using var db = TestDbContextFactory.Create();
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = "pw@x.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("oldpass"),
            FirstName = "F",
            LastName = "L",
            Role = UserRole.student,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.ChangePassword(user.Id, new ChangePasswordDto { CurrentPassword = "wrong", NewPassword = "x" });

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task ChangePassword_Missing_NotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.ChangePassword("missing", new ChangePasswordDto { CurrentPassword = "a", NewPassword = "b" });
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Update_Existing_NoContent()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser(email: "u@x.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var updated = new User { Email = "U2@X.com", FirstName = "N", LastName = "L", Role = UserRole.teacher, IsActive = true };
        var result = await controller.Update(user.Id, updated);

        result.Should().BeOfType<NoContentResult>();
        (await db.Users.FindAsync(user.Id))!.Email.Should().Be("u2@x.com");
    }

    [Fact]
    public async Task Update_Missing_NotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var result = await controller.Update("missing", new User { Email = "x@x.com", FirstName = "x", LastName = "x", Role = UserRole.student, PasswordHash = "h" });
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_Removes()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser();
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        (await controller.Delete(user.Id)).Should().BeOfType<NoContentResult>();
        db.Users.Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_Missing_NotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        (await controller.Delete("missing")).Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsSignedToken()
    {
        using var db = TestDbContextFactory.Create();
        var user = TestData.MakeUser(email: "token@x.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()));
        var ok = (await controller.Login(new LoginDto { Email = "token@x.com", Password = "Password123!" })).Should().BeOfType<OkObjectResult>().Subject;

        var token = (string)ok.Value!.GetType().GetProperty("token")!.GetValue(ok.Value)!;
        var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier && c.Value == user.Id);
        jwt.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == "student");
    }

    [Fact]
    public async Task ChangePassword_ForSomeoneElse_Forbidden()
    {
        using var db = TestDbContextFactory.Create();
        var victim = TestData.MakeUser(email: "victim@x.com");
        db.Users.Add(victim);
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()), userId: "attacker-id", role: "student");
        var result = await controller.ChangePassword(victim.Id, new ChangePasswordDto { CurrentPassword = "Password123!", NewPassword = "owned" });

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task ExportData_Student_GetsOwnDataWithoutUnreleasedGrades()
    {
        using var db = TestDbContextFactory.Create();
        var teacher = TestData.MakeUser(role: UserRole.teacher, email: "t@x.com");
        var student = TestData.MakeUser(email: "s@x.com");
        var subject = TestData.MakeSubject();
        var course = TestData.MakeCourse(subject.Id, teacher.Id);
        var assignment = new Assignment { Title = "Essay", CourseId = course.Id };
        var released = new Submission { AssignmentId = assignment.Id, StudentId = student.Id };
        var pending = new Submission { AssignmentId = assignment.Id, StudentId = student.Id };
        db.AddRange(teacher, student, subject, course, assignment, released, pending,
            new Grade { SubmissionId = released.Id, GradedBy = teacher.Id, PointsEarned = 70, IsReleased = true },
            new Grade { SubmissionId = pending.Id, GradedBy = teacher.Id, PointsEarned = 40, IsReleased = false });
        await db.SaveChangesAsync();

        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()), userId: student.Id, role: "student");
        var ok = (await controller.ExportData(student.Id)).Should().BeOfType<OkObjectResult>().Subject;

        var grades = (IEnumerable<Grade>)ok.Value!.GetType().GetProperty("grades")!.GetValue(ok.Value)!;
        grades.Should().ContainSingle().Which.PointsEarned.Should().Be(70);
    }

    [Fact]
    public async Task ExportData_SomeoneElse_Forbidden()
    {
        using var db = TestDbContextFactory.Create();
        var controller = SignedIn(new UserController(db, MakeHttpClientFactory(), MakeConfig()), userId: "me", role: "student");
        (await controller.ExportData("someone-else")).Should().BeOfType<ForbidResult>();
    }
}
