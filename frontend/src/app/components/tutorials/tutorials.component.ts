import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TutorialService } from '../../services/tutorial.service';
import { TutorialSubject, TutorialVideo } from '../../models/tutorial.model';

@Component({
  selector: 'app-tutorials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tutorials.component.html',
  styleUrls: ['./tutorials.component.css'],
})
export class TutorialsComponent implements OnInit {
  subjects: TutorialSubject[] = [];
  loading = true;
  subjectQuery = '';

  selected: TutorialSubject | null = null;
  activeChannel = 'All';

  constructor(private tutorialService: TutorialService) {}

  ngOnInit(): void {
    this.tutorialService.getSubjects().subscribe((res) => {
      this.subjects = res.subjects;
      this.loading = false;
    });
  }

  filteredSubjects(): TutorialSubject[] {
    if (!this.subjectQuery.trim()) return this.subjects;
    const q = this.subjectQuery.toLowerCase();
    return this.subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)
    );
  }

  selectSubject(s: TutorialSubject): void {
    this.selected = s;
    this.activeChannel = 'All';
  }

  backToSubjects(): void {
    this.selected = null;
  }

  channelTabs(): { name: string; count: number }[] {
    if (!this.selected) return [];
    const counts = new Map<string, number>();
    for (const v of this.selected.videos) {
      counts.set(v.channel, (counts.get(v.channel) || 0) + 1);
    }
    return [
      { name: 'All', count: this.selected.videos.length },
      ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
    ];
  }

  visibleVideos(): TutorialVideo[] {
    if (!this.selected) return [];
    if (this.activeChannel === 'All') return this.selected.videos;
    return this.selected.videos.filter((v) => v.channel === this.activeChannel);
  }

  youtubeSearchUrl(query: string): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  channelInitial(channel: string): string {
    return channel.charAt(0).toUpperCase();
  }
}
