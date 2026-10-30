using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using LearnOnline.Data;
using LearnOnline.Models;
using LearnOnline.Models.DTOs;

namespace LearnOnline.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public UserController(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        private static UserResponseDto ToResponseDto(User user) => new()
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled
        };

        // GET /api/User – return all users (minus password hashes)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users.Select(ToResponseDto));
        }

        // GET /api/User/{id} – return a single user by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetById(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(ToResponseDto(user));
        }

        // POST /api/User/register – create a new account (admin only via UI)
        [HttpPost("register")]
        public async Task<ActionResult<UserResponseDto>> Register(CreateUserDto dto)
        {
            var email = dto.Email.Trim().ToLowerInvariant();

            if (await _context.Users.AnyAsync(u => u.Email == email))
                return Conflict(new { message = "Email already registered" });

            var userId = Guid.NewGuid().ToString();
            var user = new User
            {
                Id = userId,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Role = dto.Role,
                ProfileImageUrl = !string.IsNullOrWhiteSpace(dto.ProfileImageUrl)
                    ? dto.ProfileImageUrl
                    : $"https://api.dicebear.com/9.x/thumbs/svg?seed={userId}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToResponseDto(user));
        }

        // POST /api/User/login – authenticate with email + password
        // Returns requiresTwoFactor = true when the account has 2FA enabled
        [HttpPost("login")]
        public async Task<ActionResult> Login(LoginDto dto)
        {
            var email = dto.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null || !user.IsActive)
                return Unauthorized(new { message = "Invalid email or password" });

            bool validPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!validPassword)
                return Unauthorized(new { message = "Invalid email or password" });

            if (user.TwoFactorEnabled)
                return Ok(new { requiresTwoFactor = true, pendingUserId = user.Id });

            return Ok(new
            {
                message = "Login successful",
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                role = user.Role.ToString(),
                profileImageUrl = user.ProfileImageUrl,
                twoFactorEnabled = user.TwoFactorEnabled
            });
        }

        // GET /api/User/google-config – exposes the Google client ID used by the frontend sign-in button
        [HttpGet("google-config")]
        public ActionResult GetGoogleConfig()
        {
            return Ok(new { clientId = _configuration["GoogleAuth:ClientId"] ?? string.Empty });
        }

        // POST /api/User/google – sign in with Google
        // Only existing accounts (created by admin) can log in; no auto-registration
        [HttpPost("google")]
        public async Task<ActionResult> GoogleAuth(GoogleAuthDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Credential))
                return BadRequest(new { message = "Google credential is required" });

            var client = _httpClientFactory.CreateClient();
            var url = $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(dto.Credential)}";
            var tokenInfo = await client.GetFromJsonAsync<GoogleTokenInfoDto>(url);

            if (tokenInfo == null || string.IsNullOrWhiteSpace(tokenInfo.Email))
                return Unauthorized(new { message = "Google authentication failed" });

            if (!string.Equals(tokenInfo.EmailVerified, "true", StringComparison.OrdinalIgnoreCase))
                return Unauthorized(new { message = "Google email address is not verified" });

            var configuredClientId = _configuration["GoogleAuth:ClientId"];
            if (!string.IsNullOrWhiteSpace(configuredClientId) &&
                !string.Equals(tokenInfo.Audience, configuredClientId, StringComparison.Ordinal))
            {
                return Unauthorized(new { message = "Google client ID mismatch" });
            }

            var email = tokenInfo.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            // Accounts are created by admin only – Google sign-in is for existing users
            if (user == null)
                return Unauthorized(new { message = "No account found for this Google address. Contact your administrator." });

            if (!user.IsActive)
                return Unauthorized(new { message = "This account is inactive" });

            if (!string.IsNullOrWhiteSpace(tokenInfo.Picture))
                user.ProfileImageUrl = tokenInfo.Picture;

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (user.TwoFactorEnabled)
                return Ok(new { requiresTwoFactor = true, pendingUserId = user.Id });

            return Ok(new
            {
                message = "Google login successful",
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                role = user.Role.ToString(),
                profileImageUrl = user.ProfileImageUrl,
                twoFactorEnabled = user.TwoFactorEnabled,
                provider = "Google"
            });
        }

        // GET /api/User/2fa/setup/{userId}
        // Generates a fresh TOTP secret, persists it (not yet enabled), returns QR URI + manual key
        [HttpGet("2fa/setup/{userId}")]
        public async Task<ActionResult> Setup2FA(string userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found" });

            var secretBytes = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretBytes);

            user.TwoFactorSecret = base32Secret;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var issuer = "Koru";
            // Encode only the account name, keeping the colon separator literal —
            // this is what the Key URI Format spec requires for password managers to
            // correctly parse the issuer and account fields from the QR code.
            var qrCodeUri = $"otpauth://totp/{issuer}:{Uri.EscapeDataString(user.Email)}?secret={base32Secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";

            return Ok(new { manualEntryKey = base32Secret, qrCodeUri });
        }

        // POST /api/User/2fa/enable
        // Verifies a TOTP code against the stored secret and marks 2FA as active
        [HttpPost("2fa/enable")]
        public async Task<ActionResult> Enable2FA(TwoFactorCodeDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null || string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { message = "2FA setup not initiated. Please start the setup process first." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(previous: 1, future: 1));
            if (!valid)
                return BadRequest(new { message = "Invalid verification code. Please try again." });

            user.TwoFactorEnabled = true;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Two-factor authentication enabled.", twoFactorEnabled = true });
        }

        // POST /api/User/2fa/disable
        // Verifies the current TOTP code then clears 2FA
        [HttpPost("2fa/disable")]
        public async Task<ActionResult> Disable2FA(TwoFactorCodeDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { message = "2FA is not currently enabled." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(previous: 1, future: 1));
            if (!valid)
                return BadRequest(new { message = "Invalid verification code. Please try again." });

            user.TwoFactorEnabled = false;
            user.TwoFactorSecret = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Two-factor authentication disabled.", twoFactorEnabled = false });
        }

        // POST /api/User/2fa/validate
        // Used during login when 2FA is required; returns the full user session on success
        [HttpPost("2fa/validate")]
        public async Task<ActionResult> Validate2FA(TwoFactorCodeDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { message = "2FA is not enabled for this account." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(previous: 1, future: 1));
            if (!valid)
                return Unauthorized(new { message = "Invalid verification code." });

            return Ok(new
            {
                message = "Two-factor authentication successful",
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                role = user.Role.ToString(),
                profileImageUrl = user.ProfileImageUrl,
                twoFactorEnabled = user.TwoFactorEnabled
            });
        }

        // PUT /api/User/profile/{id} – update account details from settings
        [HttpPut("profile/{id}")]
        public async Task<ActionResult<UserResponseDto>> UpdateProfile(string id, UpdateUserProfileDto updated)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            var email = updated.Email.Trim().ToLowerInvariant();
            var emailTaken = await _context.Users.AnyAsync(u => u.Id != id && u.Email == email);
            if (emailTaken)
                return Conflict(new { message = "Email already registered" });

            user.Email = email;
            user.FirstName = updated.FirstName.Trim();
            user.LastName = updated.LastName.Trim();
            user.ProfileImageUrl = updated.ProfileImageUrl ?? user.ProfileImageUrl;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ToResponseDto(user));
        }

        // POST /api/User/change-password/{id} – verify the current password and save the new one
        [HttpPost("change-password/{id}")]
        public async Task<ActionResult> ChangePassword(string id, ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found" });

            bool validPassword = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
            if (!validPassword)
                return Unauthorized(new { message = "Current password is incorrect" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Password updated successfully" });
        }

        // PUT /api/User/{id} – update a user's profile fields
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, User updated)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Email = updated.Email.Trim().ToLowerInvariant();
            user.FirstName = updated.FirstName;
            user.LastName = updated.LastName;
            user.Role = updated.Role;
            user.ProfileImageUrl = updated.ProfileImageUrl;
            user.IsActive = updated.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/User/{id} – permanently remove a user account
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
